<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

// Pull students
$sql = "SELECT ID, first, last, grade, status
        FROM student
        ORDER BY last, first";

$result = $conn->query($sql);

if (!$result) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$rows = [];
while ($row = $result->fetch_assoc()) {
  $rows[] = [
    "id"     => (int)$row["ID"],
    "first"  => $row["first"],
    "last"   => $row["last"],
    "grade"  => (int)$row["grade"],
    "status" => ((int)$row["status"] === 1) ? "Active" : "Inactive",
    "statusValue" => (int)$row["status"]
  ];
}

echo json_encode(["ok" => true, "data" => $rows]);

?>
