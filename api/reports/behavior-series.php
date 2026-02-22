<?php
// api/reports/behavior-series.php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$student_id  = (int)($_GET["student_id"] ?? 0);
$behavior_id = (int)($_GET["behavior_id"] ?? 0);
$start       = $_GET["start"] ?? "";
$end         = $_GET["end"] ?? "";

if ($student_id <= 0 || $behavior_id <= 0 || !$start || !$end) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "student_id, behavior_id, start, end are required."]);
  exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "start/end must be YYYY-MM-DD."]);
  exit;
}

$sql = "
  SELECT
    bs.session_date,
    ROUND(AVG(bm.value) * 100, 0) AS pct
  FROM behavior_sessions bs
  JOIN behavior_marks bm
    ON bm.session_id = bs.session_id
   AND bm.behavior_id = ?
  WHERE bs.student_id = ?
    AND bs.session_date BETWEEN ? AND ?
  GROUP BY bs.session_date
  ORDER BY bs.session_date ASC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("iiss", $behavior_id, $student_id, $start, $end);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

$res = $stmt->get_result();
$rows = [];
while ($row = $res->fetch_assoc()) {
  $rows[] = [
    "date" => $row["session_date"],
    "pct"  => (int)$row["pct"],
  ];
}

echo json_encode(["ok" => true, "data" => $rows]);

