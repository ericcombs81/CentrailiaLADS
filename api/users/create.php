<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_admin();
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

// Temporary password policy:
// - All new users start with the same temporary password ("Centralia")
// - They MUST change it on first login (requires users.must_change_password column)
$tempPassword = "Centralia";
$hash = password_hash($tempPassword, PASSWORD_DEFAULT);

// If your DB does not yet have must_change_password, add it:
// ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;
$hasMustChange = false;
if ($colsRes = $conn->query("SHOW COLUMNS FROM users LIKE 'must_change_password'")) {
  $hasMustChange = ($colsRes->num_rows > 0);
}

$stmt = $hasMustChange
  ? $conn->prepare("INSERT INTO users (email, first, last, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?, 1)")
  : $conn->prepare("INSERT INTO users (email, first, last, password_hash, role) VALUES (?, ?, ?, ?, ?)");
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
  "tempPassword" => $tempPassword,
  "mustChange" => $hasMustChange ? 1 : 0
]);
