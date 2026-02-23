<?php
// api/reports/point-sheet-averages-summary.php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("DB connection missing.");
  }

  $student_id = (int)($_GET["student_id"] ?? 0);
  $start = $_GET["start"] ?? "";
  $end   = $_GET["end"] ?? "";

  if ($student_id <= 0) throw new Exception("Missing student_id");
  if (!$start || !$end) throw new Exception("Missing start/end");

  // Basic YYYY-MM-DD validation (optional but recommended)
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
    throw new Exception("start/end must be YYYY-MM-DD");
  }

  // Behaviors assigned at ANY time during the range:
  // assignment overlaps [start, end] if:
  //   start_date <= end AND (end_date IS NULL OR end_date >= start)
  //
  // Then LEFT JOIN sessions/marks in the range to compute averages.
  $sql = "
    SELECT
      b.behavior_id,
      b.behavior_text,
      ROUND(100 * AVG(CASE WHEN bs.session_id IS NULL THEN NULL ELSE COALESCE(bm.value, 0) END), 2) AS avg_pct
    FROM student_behavior_assignments sba
    JOIN behaviors b
      ON b.behavior_id = sba.behavior_id
    LEFT JOIN behavior_sessions bs
      ON bs.student_id = sba.student_id
     AND bs.session_date BETWEEN ? AND ?
    LEFT JOIN behavior_marks bm
      ON bm.session_id = bs.session_id
     AND bm.behavior_id = sba.behavior_id
    WHERE sba.student_id = ?
      AND sba.start_date <= ?
      AND (sba.end_date IS NULL OR sba.end_date >= ?)
    GROUP BY b.behavior_id, b.behavior_text
    ORDER BY b.behavior_text ASC
  ";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

  // bind order: bs range start/end, student_id, overlap end/start
  $stmt->bind_param("ssiss", $start, $end, $student_id, $end, $start);

  if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);
  $res = $stmt->get_result();

  $rows = [];
  while ($row = $res->fetch_assoc()) {
    $rows[] = [
      "behavior_id" => (int)$row["behavior_id"],
      "behavior_text" => $row["behavior_text"],
      // if avg_pct is NULL (no sessions/marks), show 0.00
      "avg_pct" => ($row["avg_pct"] === null) ? "0.00" : number_format((float)$row["avg_pct"], 2, ".", ""),
    ];
  }

  // Total avg across ALL assigned behaviors in range (based on marks that exist)
  $sqlTotal = "
    SELECT
      ROUND(100 * AVG(COALESCE(bm.value,0)), 2) AS total_avg
    FROM student_behavior_assignments sba
    JOIN behavior_sessions bs
      ON bs.student_id = sba.student_id
     AND bs.session_date BETWEEN ? AND ?
    JOIN behavior_marks bm
      ON bm.session_id = bs.session_id
     AND bm.behavior_id = sba.behavior_id
    WHERE sba.student_id = ?
      AND sba.start_date <= ?
      AND (sba.end_date IS NULL OR sba.end_date >= ?)
  ";
  $stmt2 = $conn->prepare($sqlTotal);
  if (!$stmt2) throw new Exception("Prepare total failed: " . $conn->error);

  $stmt2->bind_param("ssiss", $start, $end, $student_id, $end, $start);

  if (!$stmt2->execute()) throw new Exception("Execute total failed: " . $stmt2->error);
  $totalRow = $stmt2->get_result()->fetch_assoc();
  $total = $totalRow && $totalRow["total_avg"] !== null
    ? number_format((float)$totalRow["total_avg"], 2, ".", "")
    : "0.00";

  echo json_encode([
    "ok" => true,
    "data" => [
      "rows" => $rows,
      "total_avg" => $total
    ]
  ]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}