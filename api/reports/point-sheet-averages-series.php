<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("Database connection not available as \$conn (mysqli).");
  }

  $student_id = isset($_GET["student_id"]) ? (int)$_GET["student_id"] : 0;
  $start = $_GET["start"] ?? "";
  $end   = $_GET["end"] ?? "";

  if ($student_id <= 0) throw new Exception("Missing student_id");
  if (!$start || !$end) throw new Exception("Missing start/end");

  // Daily overall % = average of bm.value across all marks that day (value is 0/1),
  // multiplied by 100.
  $sql = "
    SELECT
      bs.session_date AS date,
      ROUND(100 * AVG(COALESCE(bm.value,0))) AS pct
    FROM behavior_sessions bs
    JOIN behavior_marks bm ON bm.session_id = bs.session_id
    WHERE bs.student_id = ?
      AND bs.session_date BETWEEN ? AND ?
    GROUP BY bs.session_date
    ORDER BY bs.session_date
  ";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

  $stmt->bind_param("iss", $student_id, $start, $end);
  if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);

  $result = $stmt->get_result();
  $rows = [];
  while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
  }

  echo json_encode(["ok" => true, "data" => $rows]);
} catch (Exception $e) {
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}

