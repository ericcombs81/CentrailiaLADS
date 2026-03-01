<?php
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

$raw = file_get_contents("php://input");
$payload = json_decode($raw ?: "{}", true);

if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid JSON"]);
  exit;
}

$ids = $payload["student_ids"] ?? [];
if (!is_array($ids)) $ids = [];

$clean = [];
foreach ($ids as $v) {
  $s = trim((string)$v);
  if ($s !== "") $clean[] = $s;
}

$selectionJson = json_encode(array_values($clean), JSON_UNESCAPED_UNICODE);

$sql = "INSERT INTO user_class_selection (user_id, selection_json)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE
          selection_json = VALUES(selection_json),
          updated_at = CURRENT_TIMESTAMP";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("is", $userId, $selectionJson);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

echo json_encode([
  "ok" => true,
  "user_id" => $userId,
  "saved_count" => count($clean)
]);