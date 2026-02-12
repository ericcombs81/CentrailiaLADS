<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$sql = "SELECT ID, email, first, last, role FROM users ORDER BY last, first";
$res = $conn->query($sql);

if (!$res) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$data = [];
while ($row = $res->fetch_assoc()) {
  $data[] = [
    "id" => (int)$row["ID"],
    "email" => $row["email"],
    "first" => $row["first"],
    "last" => $row["last"],
    "role" => $row["role"]
  ];
}

echo json_encode(["ok" => true, "data" => $data]);
