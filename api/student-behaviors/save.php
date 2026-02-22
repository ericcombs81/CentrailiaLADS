<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

$raw = file_get_contents("php://input");
$body = json_decode($raw, true);

if (!is_array($body)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid JSON body"]);
  exit;
}

$student_id   = (int)($body["student_id"] ?? 0);
$behavior_ids = $body["behavior_ids"] ?? [];

if ($student_id <= 0) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "student_id is required"]);
  exit;
}
if (!is_array($behavior_ids)) $behavior_ids = [];

$behavior_ids = array_values(array_unique(array_map("intval", $behavior_ids)));
$behavior_ids = array_values(array_filter($behavior_ids, fn($x) => $x > 0));

$today = date("Y-m-d");
$yesterday = date("Y-m-d", strtotime("-1 day"));

try {
  $conn->begin_transaction();

  // Build desired set for quick lookup
  $desired = array_fill_keys($behavior_ids, true);

  // 1) Load currently active assignments (end_date IS NULL)
  $stmtActive = $conn->prepare("
    SELECT behavior_id, start_date
    FROM student_behavior_assignments
    WHERE student_id = ? AND end_date IS NULL
  ");
  if (!$stmtActive) throw new Exception($conn->error);

  $stmtActive->bind_param("i", $student_id);
  if (!$stmtActive->execute()) throw new Exception($stmtActive->error);
  $resActive = $stmtActive->get_result();

  $active = []; // behavior_id => start_date
  while ($row = $resActive->fetch_assoc()) {
    $bid = (int)$row["behavior_id"];
    $active[$bid] = $row["start_date"];
  }

  // 2) Deactivate behaviors that are currently active but NOT desired
  //    - If it started today, delete the row (avoid end_date < start_date weirdness)
  //    - Otherwise end_date = yesterday (so changes take effect starting today)
  $stmtEnd = $conn->prepare("
    UPDATE student_behavior_assignments
    SET end_date = ?
    WHERE student_id = ? AND behavior_id = ? AND end_date IS NULL
  ");
  if (!$stmtEnd) throw new Exception($conn->error);

  $stmtDelToday = $conn->prepare("
    DELETE FROM student_behavior_assignments
    WHERE student_id = ? AND behavior_id = ? AND end_date IS NULL AND start_date = ?
  ");
  if (!$stmtDelToday) throw new Exception($conn->error);

  foreach ($active as $bid => $start_date) {
    if (isset($desired[$bid])) continue; // still desired, keep active

    if ($start_date === $today) {
      // started today -> delete it entirely
      $stmtDelToday->bind_param("iis", $student_id, $bid, $today);
      if (!$stmtDelToday->execute()) throw new Exception($stmtDelToday->error);
    } else {
      // started earlier -> end yesterday so it is inactive starting today
      $stmtEnd->bind_param("sii", $yesterday, $student_id, $bid);
      if (!$stmtEnd->execute()) throw new Exception($stmtEnd->error);
    }
  }

  // 3) Activate behaviors that are desired but NOT currently active
  //    - If there is already a row for (student, behavior, start_date=today) ended earlier today -> reopen it
  //    - Else insert a new row starting today
  $stmtReopen = $conn->prepare("
    UPDATE student_behavior_assignments
    SET end_date = NULL
    WHERE student_id = ? AND behavior_id = ? AND start_date = ? AND end_date IS NOT NULL
    LIMIT 1
  ");
  if (!$stmtReopen) throw new Exception($conn->error);

  $stmtInsert = $conn->prepare("
    INSERT INTO student_behavior_assignments (student_id, behavior_id, start_date, end_date)
    VALUES (?, ?, ?, NULL)
  ");
  if (!$stmtInsert) throw new Exception($conn->error);

  foreach ($behavior_ids as $bid) {
    $bid = (int)$bid;
    if (isset($active[$bid])) continue; // already active

    // Try to reopen (same-day restore)
    $stmtReopen->bind_param("iis", $student_id, $bid, $today);
    if (!$stmtReopen->execute()) throw new Exception($stmtReopen->error);

    if ($stmtReopen->affected_rows > 0) {
      continue; // reopened instead of inserting (prevents duplicate key)
    }

    // Insert a brand-new active assignment starting today
    $stmtInsert->bind_param("iis", $student_id, $bid, $today);
    if (!$stmtInsert->execute()) throw new Exception($stmtInsert->error);
  }

  $conn->commit();
  echo json_encode(["ok" => true]);

} catch (Throwable $e) {
  $conn->rollback();
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}

