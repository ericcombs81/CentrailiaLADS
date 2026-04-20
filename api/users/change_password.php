<?php
declare(strict_types=1);

require_once __DIR__ . "/../../auth.php";
require_login();

// If auth.php does NOT already bootstrap security, uncomment:
// require_once __DIR__ . "/../../includes/security.php";
// security_bootstrap();

security_headers_json();
csrf_verify_or_die();

require_once __DIR__ . "/../../config/db.php";

$userId = (int)($_SESSION['user_id'] ?? 0);
if ($userId <= 0) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "Not logged in."]);
  exit;
}

$password  = $_POST["password"]  ?? "";
$password2 = $_POST["password2"] ?? "";

if (!is_string($password) || !is_string($password2)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid input."]);
  exit;
}

$password = trim($password);
$password2 = trim($password2);

if ($password === "" || $password2 === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Please enter both password fields."]);
  exit;
}

if ($password !== $password2) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Passwords do not match."]);
  exit;
}

if (strlen($password) < 8) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Password must be at least 8 characters."]);
  exit;
}

// Optional: stronger requirements (uncomment if you want)
// if (!preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
//   http_response_code(400);
//   echo json_encode(["ok" => false, "error" => "Password must include upper, lower, and a number."]);
//   exit;
// }

$hash = password_hash($password, PASSWORD_DEFAULT);
if ($hash === false) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Server error."]);
  exit;
}

$stmt = $conn->prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?");
$stmt->bind_param("si", $hash, $userId);

if (!$stmt->execute()) {
  error_log("Change password failed for user {$userId}: " . $stmt->error);
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "Server error."]);
  exit;
}
$_SESSION["must_change_password"] = 0;  // <-- add this
echo json_encode(["ok" => true]);