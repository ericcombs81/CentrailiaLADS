<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

// Basic input pull
$first = trim($_POST["first"] ?? "");
$last  = trim($_POST["last"] ?? "");
$grade = (int)($_POST["grade"] ?? 0);

$first = preg_replace('/\s+/', ' ', $first);
$last  = preg_replace('/\s+/', ' ', $last);


// Server-side validation (never trust the browser)
if ($first === "" || $last === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "First and last name are required."]);
  exit;
}
if ($grade < 1 || $grade > 12) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Grade must be between 1 and 12."]);
  exit;
}

// Optional: length clamp (prevents absurd input)
if (mb_strlen($first) > 50 || mb_strlen($last) > 75) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Name is too long."]);
  exit;
}

// ✅ Prepared statement prevents SQL injection
$stmt = $conn->prepare("INSERT INTO student (first, last, grade, status) VALUES (?, ?, ?, 1)");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("ssi", $first, $last, $grade);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $stmt->error]);
  exit;
}

$newId = $stmt->insert_id;

echo json_encode([
  "ok" => true,
  "data" => [
    "id" => $newId,
    "first" => $first,
    "last" => $last,
    "grade" => $grade,
    "status" => "Active",
    "statusValue" => 1
  ]
]);
?>