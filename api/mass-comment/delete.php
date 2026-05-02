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
  if ($id <= 0) throw new Exception("Missing id");

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
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) throw new Exception("Not found");

  $prefix = mc_prefix($id, (string)$row["comment_text"]);
  $dates = mc_date_range((string)$row["start_date"], (string)$row["end_date"]);

  $stmtRemove = $conn->prepare("
    UPDATE `behavior_sessions`
    SET `comments` = REPLACE(`comments`, ?, '')
    WHERE `session_date` = ?
      AND `comments` LIKE CONCAT('%[[MC:', ?, ']]%')
  ");

  foreach ($dates as $date) {
    $stmtRemove->bind_param("ssi", $prefix, $date, $id);
    if (!$stmtRemove->execute()) throw new Exception($stmtRemove->error);
  }

  $stmtDel = $conn->prepare("DELETE FROM `mass_comments` WHERE `id`=?");
  $stmtDel->bind_param("i", $id);
  if (!$stmtDel->execute()) throw new Exception($stmtDel->error);

  $conn->commit();
  echo json_encode(["ok" => true, "days_removed" => count($dates)]);

} catch (Throwable $e) {
  if (isset($conn)) { try { $conn->rollback(); } catch (Throwable $x) {} }
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
