<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$text = trim($_POST["behavior_text"] ?? "");
$is_default = (int)($_POST["is_default"] ?? 0);
$is_active = 1;

if ($text === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Behavior text is required."]);
  exit;
}

$is_default = ($is_default === 1) ? 1 : 0;
$is_active = 1;

$stmt = $conn->prepare("INSERT INTO behaviors (behavior_text, is_active, is_default) VALUES (?, ?, ?)");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("sii", $text, $is_active, $is_default);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

$id = $conn->insert_id;

// Fetch created_at
$res = $conn->query("SELECT created_at FROM behaviors WHERE behavior_id = " . (int)$id);
$createdAt = null;
if ($res && $row = $res->fetch_assoc()) $createdAt = $row["created_at"];

echo json_encode([
  "ok" => true,
  "data" => [
    "behavior_id" => (int)$id,
    "behavior_text" => $text,
    "is_active" => $is_active,
    "is_default" => $is_default,
    "created_at" => $createdAt
  ]
]);
