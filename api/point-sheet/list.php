<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_csrf();
require_once __DIR__ . "/../../config/db.php";
$student_id = (int)($_GET["student_id"] ?? 0);
$session_date = trim($_GET["session_date"] ?? "");

if ($student_id <= 0 || $session_date === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "student_id and session_date are required"]);
  exit;
}

function behavior_sessions_has_unexcused_absence(mysqli $conn): bool {
  static $hasColumn = null;
  if ($hasColumn !== null) return $hasColumn;

  $res = $conn->query("SHOW COLUMNS FROM behavior_sessions LIKE 'unexcused_absence'");
  $hasColumn = $res && $res->num_rows > 0;
  return $hasColumn;
}

$hasUnexcusedAbsence = behavior_sessions_has_unexcused_absence($conn);
$unexcusedSelect = $hasUnexcusedAbsence ? ", unexcused_absence" : ", 0 AS unexcused_absence";

$stmt = $conn->prepare("
  SELECT session_id, comments, present_mask{$unexcusedSelect}
  FROM behavior_sessions
  WHERE student_id=? AND session_date=?
  LIMIT 1
");
if (!$stmt) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt->bind_param("is", $student_id, $session_date);
$stmt->execute();
$res = $stmt->get_result();

if (!($row = $res->fetch_assoc())) {
  echo json_encode(["ok" => true, "exists" => false, "comments" => "", "present_mask" => 0, "unexcused_absence" => 0, "marks" => new stdClass()]);
  exit;
}

$session_id = (int)$row["session_id"];
$comments = $row["comments"] ?? "";
$present_mask = (int)($row["present_mask"] ?? 0);
$unexcused_absence = (int)($row["unexcused_absence"] ?? 0);

// Load marks
$stmt2 = $conn->prepare("SELECT behavior_id, period, value FROM behavior_marks WHERE session_id=?");
if (!$stmt2) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $conn->error]);
  exit;
}

$stmt2->bind_param("i", $session_id);
$stmt2->execute();
$res2 = $stmt2->get_result();

$marks = [];
while ($m = $res2->fetch_assoc()) {
  $bid = (int)$m["behavior_id"];
  $p   = (int)$m["period"];
  $v   = is_null($m["value"]) ? 0 : (int)$m["value"];
  $marks["b{$bid}_p{$p}"] = ($v === 1) ? 1 : 0;
}

echo json_encode([
  "ok" => true,
  "exists" => true,
  "session_id" => $session_id,
  "comments" => $comments,
  "present_mask" => $present_mask,
  "unexcused_absence" => $unexcused_absence,
  "marks" => $marks
]);
