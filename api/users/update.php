<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$id    = (int)($_POST["id"] ?? 0);
$first = trim($_POST["first"] ?? "");
$last  = trim($_POST["last"] ?? "");
$email = trim($_POST["email"] ?? "");
$role  = trim($_POST["role"] ?? "Teacher");

if ($id <= 0 || $first === "" || $last === "" || $email === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing or invalid fields."]);
  exit;
}

if ($role !== "Teacher" && $role !== "Admin") $role = "Teacher";

$stmt = $conn->prepare("UPDATE users SET email=?, first=?, last=?, role=? WHERE ID=?");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("ssssi", $email, $first, $last, $role, $id);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

echo json_encode([
  "ok" => true,
  "data" => [
    "id" => $id,
    "email" => $email,
    "first" => $first,
    "last" => $last,
    "role" => $role
  ]
]);
