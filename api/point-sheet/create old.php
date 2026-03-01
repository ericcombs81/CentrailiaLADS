<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$raw = file_get_contents("php://input");
$input = json_decode($raw, true);

if (!is_array($input)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid JSON body"]);
  exit;
}

$student_id   = (int)($input["student_id"] ?? 0);
$session_date = trim($input["session_date"] ?? "");
$comments     = $input["comments"] ?? "";
$marks        = $input["marks"] ?? [];

if ($student_id <= 0 || $session_date === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "student_id and session_date are required"]);
  exit;
}

if (!is_array($marks)) $marks = [];

$conn->begin_transaction();

try {
  // 1) Find or create session (student+date)
  $session_id = null;

  $stmt = $conn->prepare("SELECT session_id FROM behavior_sessions WHERE student_id=? AND session_date=? LIMIT 1");
  if (!$stmt) throw new Exception($conn->error);
  $stmt->bind_param("is", $student_id, $session_date);
  $stmt->execute();
  $res = $stmt->get_result();
  if ($row = $res->fetch_assoc()) $session_id = (int)$row["session_id"];
  $stmt->close();

  if ($session_id === null) {
    $stmt = $conn->prepare("INSERT INTO behavior_sessions (student_id, session_date, comments) VALUES (?, ?, ?)");
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param("iss", $student_id, $session_date, $comments);
    if (!$stmt->execute()) throw new Exception($stmt->error);
    $session_id = (int)$conn->insert_id;
    $stmt->close();
  } else {
    $stmt = $conn->prepare("UPDATE behavior_sessions SET comments=? WHERE session_id=?");
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param("si", $comments, $session_id);
    if (!$stmt->execute()) throw new Exception($stmt->error);
    $stmt->close();
  }

  // 2) Upsert marks (composite key: session_id, behavior_id, period)
  // created_at refreshed each time you save a cell
  $stmt = $conn->prepare("
    INSERT INTO behavior_marks (session_id, behavior_id, period, value, created_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE value=VALUES(value), created_at=NOW()
  ");
  if (!$stmt) throw new Exception($conn->error);

  foreach ($marks as $m) {
    $behavior_id = (int)($m["behavior_id"] ?? 0);
    $period      = (int)($m["period"] ?? 0);
    $value       = (int)($m["value"] ?? 0);

    if ($behavior_id <= 0) continue;
    if ($period < 1 || $period > 10) continue;
    $value = ($value === 1) ? 1 : 0;

    $stmt->bind_param("iiii", $session_id, $behavior_id, $period, $value);
    if (!$stmt->execute()) throw new Exception($stmt->error);
  }

  $stmt->close();
  $conn->commit();

  echo json_encode(["ok" => true, "session_id" => $session_id]);
} catch (Exception $e) {
  $conn->rollback();
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
