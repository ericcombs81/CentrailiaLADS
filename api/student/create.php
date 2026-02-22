<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

// Basic input pull
$first = trim($_POST["first"] ?? "");
$last  = trim($_POST["last"] ?? "");
$grade = (int)($_POST["grade"] ?? 0);

$first = preg_replace('/\s+/', ' ', $first);
$last  = preg_replace('/\s+/', ' ', $last);

// Server-side validation
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
if (mb_strlen($first) > 50 || mb_strlen($last) > 75) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Name is too long."]);
  exit;
}

try {
  // ✅ Transaction so we never create a student without default assignments
  $conn->begin_transaction();

  // 1) Insert student
  $stmt = $conn->prepare("INSERT INTO student (first, last, grade, status) VALUES (?, ?, ?, 1)");
  if (!$stmt) throw new Exception($conn->error);

  $stmt->bind_param("ssi", $first, $last, $grade);
  if (!$stmt->execute()) throw new Exception($stmt->error);

  $newId = (int)$stmt->insert_id;
  $stmt->close();

  // 2) Auto-assign all default behaviors (is_default=1) starting today
  //    assigned_by_user_id stays NULL (since you don't care who assigned it)
$sqlAssign = "
  INSERT INTO student_behavior_assignments (student_id, behavior_id, start_date, end_date)
  SELECT ?, b.behavior_id, CURDATE(), NULL
  FROM behaviors b
  WHERE b.is_default = 1
    AND b.is_active = 1
";


  $stmt2 = $conn->prepare($sqlAssign);
  if (!$stmt2) throw new Exception($conn->error);

  $stmt2->bind_param("i", $newId);
  if (!$stmt2->execute()) throw new Exception($stmt2->error);
  $stmt2->close();

  $conn->commit();

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
} catch (Exception $e) {
  $conn->rollback();
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
?>
