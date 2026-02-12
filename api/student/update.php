
<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$id     = (int)($_POST["id"] ?? 0);
$first  = trim($_POST["first"] ?? "");
$last   = trim($_POST["last"] ?? "");
$grade  = (int)($_POST["grade"] ?? 0);
$status = (int)($_POST["status"] ?? 1); // 1 or 0

if ($id <= 0 || $first === "" || $last === "" || $grade < 0 || $grade > 12 || ($status !== 0 && $status !== 1)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Missing or invalid fields."]);
  exit;
}

$stmt = $conn->prepare("UPDATE student SET first=?, last=?, grade=?, status=? WHERE ID=?");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("ssiii", $first, $last, $grade, $status, $id);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

echo json_encode([
  "ok" => true,
  "data" => [
    "id" => $id,
    "first" => $first,
    "last" => $last,
    "grade" => $grade,
    "statusValue" => $status,
    "status" => ($status === 1) ? "Active" : "Inactive"
  ]
]);




