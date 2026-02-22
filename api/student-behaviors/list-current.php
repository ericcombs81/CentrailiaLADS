<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$student_id = (int)($_GET["student_id"] ?? 0);
if ($student_id <= 0) {
  http_response_code(400);
  echo json_encode(["ok"=>false, "error"=>"student_id required"]);
  exit;
}

$sql = "
  SELECT behavior_id
  FROM student_behavior_assignments
  WHERE student_id = ?
    AND end_date IS NULL
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $student_id);
$stmt->execute();
$res = $stmt->get_result();

$ids = [];
while ($row = $res->fetch_assoc()) {
  $ids[] = (int)$row["behavior_id"];
}

echo json_encode(["ok"=>true, "data"=>$ids]);
