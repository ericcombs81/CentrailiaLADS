<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_method(["GET"]);
require_once __DIR__ . "/../../config/db.php";

header("Content-Type: application/json; charset=utf-8");

$userId = (int)($_SESSION["user_id"] ?? 0);
if ($userId <= 0) {
  http_response_code(401);
  echo json_encode(["ok" => false, "error" => "Unauthorized"]);
  exit;
}

$sql = "SELECT selection_json, updated_at
        FROM user_class_selection
        WHERE user_id = ?
        LIMIT 1";

$stmt = $conn->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("i", $userId);
if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

$result = $stmt->get_result();
$row = $result ? $result->fetch_assoc() : null;

$studentIds = [];
$updatedAt = null;

if ($row) {
  $updatedAt = $row["updated_at"] ?? null;
  $decoded = json_decode($row["selection_json"] ?? "[]", true);
  if (is_array($decoded)) {
    $studentIds = array_values(array_map(fn($v) => (string)$v, $decoded));
  }
}

echo json_encode([
  "ok" => true,
  "user_id" => $userId,
  "data" => [
    "student_ids" => $studentIds,
    "updated_at" => $updatedAt
  ]
]);