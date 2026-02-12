<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$id = (int)($_POST["behavior_id"] ?? 0);
$text = trim($_POST["behavior_text"] ?? "");
$is_default = (int)($_POST["is_default"] ?? 0);
$is_active  = (int)($_POST["is_active"] ?? 1);

if ($id <= 0 || $text === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing or invalid fields."]);
  exit;
}

$is_default = ($is_default === 1) ? 1 : 0;
$is_active  = ($is_active === 1) ? 1 : 0;

$stmt = $conn->prepare("UPDATE behaviors SET behavior_text=?, is_default=? WHERE behavior_id=?");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("sii", $text, $is_default, $id);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

// Return updated row
$res = $conn->query("
  SELECT behavior_id, behavior_text, is_active, created_at, is_default
  FROM behaviors
  WHERE behavior_id = " . (int)$id . " LIMIT 1
");

if (!$res) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$row = $res->fetch_assoc();

echo json_encode([
  "ok" => true,
  "data" => [
    "behavior_id" => (int)$row["behavior_id"],
    "behavior_text" => $row["behavior_text"],
    "is_active" => (int)$row["is_active"],
    "is_default" => (int)$row["is_default"],
    "created_at" => $row["created_at"]
  ]
]);
