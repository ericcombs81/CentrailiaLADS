<?php
// api/reports/behavior-options.php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$student_id = (int)($_GET["student_id"] ?? 0);
$start      = $_GET["start"] ?? "";
$end        = $_GET["end"] ?? "";

if ($student_id <= 0 || !$start || !$end) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "student_id, start, end are required."]);
  exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "start/end must be YYYY-MM-DD."]);
  exit;
}

$sql = "
  SELECT DISTINCT b.behavior_id, b.behavior_text
  FROM behavior_sessions bs
  JOIN behavior_marks bm ON bm.session_id = bs.session_id
  JOIN behaviors b       ON b.behavior_id = bm.behavior_id
  WHERE bs.student_id = ?
    AND bs.session_date BETWEEN ? AND ?
  ORDER BY b.behavior_text ASC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("iss", $student_id, $start, $end);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

$res = $stmt->get_result();
$data = [];
while ($row = $res->fetch_assoc()) {
  $data[] = [
    "behavior_id" => (int)$row["behavior_id"],
    "behavior_text" => $row["behavior_text"],
  ];
}

echo json_encode(["ok" => true, "data" => $data]);
