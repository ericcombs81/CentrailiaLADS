<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$id = (int)($_POST["id"] ?? 0);
if ($id <= 0) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing id."]);
  exit;
}

$stmt = $conn->prepare("DELETE FROM users WHERE ID=?");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("i", $id);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

echo json_encode(["ok" => true]);
