<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$student_id = (int)($_GET["student_id"] ?? 0);
$date = trim($_GET["date"] ?? "");

if ($student_id <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
  http_response_code(400);
  echo json_encode(["ok"=>false, "error"=>"student_id and date (YYYY-MM-DD) required"]);
  exit;
}

// Try assigned behaviors first (active on that date)
$sql = "
  SELECT b.behavior_id, b.behavior_text
  FROM student_behavior_assignments sba
  JOIN behaviors b ON b.behavior_id = sba.behavior_id
  WHERE sba.student_id = ?
    AND sba.start_date <= ?
    AND (sba.end_date IS NULL OR sba.end_date >= ?)
  ORDER BY b.behavior_id ASC
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iss", $student_id, $date, $date);
$stmt->execute();
$res = $stmt->get_result();

$data = [];
while ($row = $res->fetch_assoc()) {
  $data[] = [
    "behavior_id" => (int)$row["behavior_id"],
    "behavior_text" => $row["behavior_text"]
  ];
}

if (count($data) > 0) {
  echo json_encode(["ok"=>true, "source"=>"assigned", "data"=>$data]);
  exit;
}

// Fallback to defaults
$sql2 = "
  SELECT behavior_id, behavior_text
  FROM behaviors
  WHERE is_default = 1
  ORDER BY behavior_id ASC
";
$res2 = $conn->query($sql2);
if (!$res2) {
  http_response_code(500);
  echo json_encode(["ok"=>false, "error"=>$conn->error]);
  exit;
}

$data2 = [];
while ($row = $res2->fetch_assoc()) {
  $data2[] = [
    "behavior_id" => (int)$row["behavior_id"],
    "behavior_text" => $row["behavior_text"]
  ];
}

echo json_encode(["ok"=>true, "source"=>"default", "data"=>$data2]);
