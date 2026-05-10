<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_csrf();
api_require_admin();
api_require_method(["POST"]);
require_once __DIR__ . "/../../config/db.php";

$id = (int)($_POST["behavior_id"] ?? 0);
if ($id <= 0) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "behavior_id is required."]);
  exit;
}

$stmt = $conn->prepare("
  SELECT behavior_id, behavior_text, is_active
  FROM behaviors
  WHERE behavior_id = ?
  LIMIT 1
");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("i", $id);
$stmt->execute();
$behavior = $stmt->get_result()->fetch_assoc();

if (!$behavior) {
  http_response_code(404);
  echo json_encode(["ok" => false, "error" => "Behavior not found."]);
  exit;
}

$stmtAssigned = $conn->prepare("
  SELECT s.ID, s.first, s.last
  FROM student_behavior_assignments sba
  JOIN student s ON s.ID = sba.student_id
  WHERE sba.behavior_id = ?
    AND sba.end_date IS NULL
  ORDER BY s.last ASC, s.first ASC
");
if (!$stmtAssigned) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmtAssigned->bind_param("i", $id);
$stmtAssigned->execute();
$resAssigned = $stmtAssigned->get_result();

$students = [];
while ($row = $resAssigned->fetch_assoc()) {
  $students[] = [
    "id" => (int)$row["ID"],
    "first" => $row["first"],
    "last" => $row["last"],
    "label" => trim($row["last"] . ", " . $row["first"]),
  ];
}

if (count($students) > 0) {
  http_response_code(409);
  echo json_encode([
    "ok" => false,
    "error" => "This behavior is currently assigned to " . count($students) . " student(s). Unassign it before deleting.",
    "assigned_students" => $students,
  ]);
  exit;
}

$stmtDelete = $conn->prepare("UPDATE behaviors SET is_active = 0 WHERE behavior_id = ?");
if (!$stmtDelete) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmtDelete->bind_param("i", $id);
if (!$stmtDelete->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmtDelete->error]);
  exit;
}

echo json_encode([
  "ok" => true,
  "data" => [
    "behavior_id" => (int)$behavior["behavior_id"],
    "behavior_text" => $behavior["behavior_text"],
    "is_active" => 0,
  ],
]);
