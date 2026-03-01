<?php
declare(strict_types=1);

require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_admin();
api_require_method(["POST"]);

require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$id = $_POST["id"] ?? "";
if ($id === "" || !ctype_digit((string)$id)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing/invalid id."]);
  exit;
}

$tempPassword = "Centralia";
$hash = password_hash($tempPassword, PASSWORD_DEFAULT);

// Detect optional must_change_password column
$hasMustChange = false;
if ($colsRes = $conn->query("SHOW COLUMNS FROM users LIKE 'must_change_password'")) {
  $hasMustChange = ($colsRes->num_rows > 0);
}

$stmt = $hasMustChange
  ? $conn->prepare("UPDATE users SET password_hash=?, must_change_password=1 WHERE ID=?")
  : $conn->prepare("UPDATE users SET password_hash=? WHERE ID=?");

if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$iid = (int)$id;
$stmt->bind_param("si", $hash, $iid);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

echo json_encode(["ok" => true, "tempPassword" => $tempPassword]);
