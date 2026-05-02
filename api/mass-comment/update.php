<?php
require_once __DIR__ . "/../_guard.php";
api_require_login();
api_require_csrf();
api_require_admin();
api_require_method(["POST"]);
require_once __DIR__ . "/../../config/db.php";

function mc_valid_date(string $date): bool {
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) return false;
  [$y, $m, $d] = array_map('intval', explode('-', $date));
  return checkdate($m, $d, $y);
}

function mc_date_range(string $start, string $end, int $maxDays = 370): array {
  if (!mc_valid_date($start) || !mc_valid_date($end)) throw new Exception("Invalid date range");
  $s = new DateTimeImmutable($start);
  $e = new DateTimeImmutable($end);
  if ($e < $s) throw new Exception("End date must be on or after start date");
  $days = [];
  for ($d = $s; $d <= $e; $d = $d->modify('+1 day')) {
    $days[] = $d->format('Y-m-d');
    if (count($days) > $maxDays) throw new Exception("Date range is too large. Please keep it to {$maxDays} days or fewer.");
  }
  return $days;
}

function mc_prefix(int $id, string $text): string {
  return "[[MC:$id]] " . $text . "\n\n";
}

try {
  $body = json_decode(file_get_contents("php://input"), true) ?: [];
  $id = (int)($body["id"] ?? 0);
  $newStart = (string)($body["start_date"] ?? "");
  $newEnd = (string)($body["end_date"] ?? $newStart);
  $newText = trim((string)($body["comment_text"] ?? ""));

  if ($id <= 0) throw new Exception("Missing id");
  if ($newText === "") throw new Exception("Comment text required");
  $newDates = mc_date_range($newStart, $newEnd);

  $conn->begin_transaction();

  $stmt = $conn->prepare("
    SELECT
      COALESCE(`start_date`, `comment_date`) AS `start_date`,
      COALESCE(`end_date`, `comment_date`) AS `end_date`,
      `comment_text`
    FROM `mass_comments`
    WHERE `id`=?
  ");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $old = $stmt->get_result()->fetch_assoc();
  if (!$old) throw new Exception("Not found");

  $oldDates = mc_date_range((string)$old["start_date"], (string)$old["end_date"]);
  $oldPrefix = mc_prefix($id, (string)$old["comment_text"]);
  $newPrefix = mc_prefix($id, $newText);

  // Remove the old tagged block from every date where this mass comment used to apply.
  $stmtRemove = $conn->prepare("
    UPDATE `behavior_sessions`
    SET `comments` = REPLACE(`comments`, ?, '')
    WHERE `session_date` = ?
      AND `comments` LIKE CONCAT('%[[MC:', ?, ']]%')
  ");
  foreach ($oldDates as $date) {
    $stmtRemove->bind_param("ssi", $oldPrefix, $date, $id);
    if (!$stmtRemove->execute()) throw new Exception($stmtRemove->error);
  }

  // Update the mass comment record. comment_date remains start_date for backward compatibility.
  $stmtUpdate = $conn->prepare("
    UPDATE `mass_comments`
    SET `start_date`=?, `end_date`=?, `comment_date`=?, `comment_text`=?
    WHERE `id`=?
  ");
  $stmtUpdate->bind_param("ssssi", $newStart, $newEnd, $newStart, $newText, $id);
  if (!$stmtUpdate->execute()) throw new Exception($stmtUpdate->error);

  // Ensure sessions exist for every active student on every newly selected date.
  $stmtIns = $conn->prepare("
    INSERT INTO `behavior_sessions` (`student_id`, `session_date`, `comments`)
    SELECT s.`ID`, ?, ''
    FROM `student` s
    WHERE s.`status` = 1
      AND NOT EXISTS (
        SELECT 1 FROM `behavior_sessions` bs
        WHERE bs.`student_id` = s.`ID` AND bs.`session_date` = ?
      )
  ");

  // Apply the new tagged block to every active student's session in the new range.
  $stmtApply = $conn->prepare("
    UPDATE `behavior_sessions` bs
    JOIN `student` s ON s.`ID` = bs.`student_id`
    SET bs.`comments` = CASE
      WHEN bs.`comments` LIKE CONCAT('%[[MC:', ?, ']]%') THEN bs.`comments`
      ELSE CONCAT(?, IFNULL(bs.`comments`, ''))
    END
    WHERE bs.`session_date` = ?
      AND s.`status` = 1
  ");

  foreach ($newDates as $date) {
    $stmtIns->bind_param("ss", $date, $date);
    if (!$stmtIns->execute()) throw new Exception($stmtIns->error);

    $stmtApply->bind_param("iss", $id, $newPrefix, $date);
    if (!$stmtApply->execute()) throw new Exception($stmtApply->error);
  }

  $conn->commit();
  echo json_encode(["ok" => true, "old_days" => count($oldDates), "new_days" => count($newDates)]);

} catch (Throwable $e) {
  if (isset($conn)) { try { $conn->rollback(); } catch (Throwable $x) {} }
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
