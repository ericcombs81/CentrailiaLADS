<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

// Defaults on top, then alphabetical
$sql = "
  SELECT behavior_id, behavior_text, is_active, created_at, is_default
  FROM behaviors
  ORDER BY is_default DESC, behavior_text ASC
";

$res = $conn->query($sql);
if (!$res) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$data = [];
while ($row = $res->fetch_assoc()) {
  $data[] = [
    "behavior_id" => (int)$row["behavior_id"],
    "behavior_text" => $row["behavior_text"],
    "is_active" => (int)$row["is_active"],
    "is_default" => (int)$row["is_default"],
    "created_at" => $row["created_at"],
  ];
}

echo json_encode(["ok" => true, "data" => $data]);
