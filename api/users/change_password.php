<?php
declare(strict_types=1);

require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_method(["POST"]);

require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$userId = (int)($_SESSION["user_id"] ?? 0);
if ($userId <= 0) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "Unauthorized"]);
  exit;
}

$p1 = (string)($_POST["password"] ?? "");
$p2 = (string)($_POST["password2"] ?? "");

if ($p1 === "" || $p2 === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Password required."]);
  exit;
}
if ($p1 !== $p2) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Passwords do not match."]);
  exit;
}
if (strlen($p1) < 8) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Password must be at least 8 characters."]);
  exit;
}
if (strcasecmp($p1, "Centralia") === 0) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Please choose a password other than 'Centralia'."]);
  exit;
}

$hash = password_hash($p1, PASSWORD_DEFAULT);

// Optional must_change_password column
$hasMustChange = false;
if ($colsRes = $conn->query("SHOW COLUMNS FROM users LIKE 'must_change_password'")) {
  $hasMustChange = ($colsRes->num_rows > 0);
}

$stmt = $hasMustChange
  ? $conn->prepare("UPDATE users SET password_hash=?, must_change_password=0 WHERE ID=?")
  : $conn->prepare("UPDATE users SET password_hash=? WHERE ID=?");

if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("si", $hash, $userId);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

// Clear session flag so app access opens up immediately
$_SESSION["must_change_password"] = 0;

echo json_encode(["ok" => true]);
