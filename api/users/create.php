<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$first = trim($_POST["first"] ?? "");
$last  = trim($_POST["last"] ?? "");
$email = trim($_POST["email"] ?? "");
$role  = trim($_POST["role"] ?? "Teacher");

if ($first === "" || $last === "" || $email === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing required fields."]);
  exit;
}

if ($role !== "Teacher" && $role !== "Admin") $role = "Teacher";

// Generate temp password (8 chars)
$alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
$tempPassword = "";
for ($i = 0; $i < 8; $i++) {
  $tempPassword .= $alphabet[random_int(0, strlen($alphabet) - 1)];
}

// One-way hash (safe)
$hash = password_hash($tempPassword, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO users (email, first, last, password_hash, role) VALUES (?, ?, ?, ?, ?)");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("sssss", $email, $first, $last, $hash, $role);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

$id = $conn->insert_id;

echo json_encode([
  "ok" => true,
  "data" => [
    "id" => (int)$id,
    "email" => $email,
    "first" => $first,
    "last" => $last,
    "role" => $role
  ],
  "tempPassword" => $tempPassword
]);
