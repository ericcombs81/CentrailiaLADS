<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("Database connection not available as \$conn (mysqli).");
  }

  $raw = file_get_contents("php://input");
  $body = json_decode($raw, true);
  if (!is_array($body)) throw new Exception("Invalid JSON body");

  $year_start = (int)($body["year_start"] ?? 0);
  $days = $body["days"] ?? null;

  if ($year_start < 2000 || $year_start > 2100) throw new Exception("Invalid year_start");
  if (!is_array($days)) throw new Exception("Missing days[]");

  $start = sprintf("%04d-08-01", $year_start);
  $end   = sprintf("%04d-07-31", $year_start + 1);

  $conn->begin_transaction();

  // Upsert each submitted day
  $sql = "
    INSERT INTO school_calendar_days (calendar_date, no_school, note)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      no_school = VALUES(no_school),
      note = VALUES(note)
  ";
  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

  foreach ($days as $d) {
    $date = (string)($d["date"] ?? "");
    $no_school = (int)($d["no_school"] ?? 0);
    $note = isset($d["note"]) ? (string)$d["note"] : null;

    if (!$date) continue;

    // Only allow dates in the selected school year window
    if ($date < $start || $date > $end) continue;

    $stmt->bind_param("sis", $date, $no_school, $note);
    if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);
  }

  $conn->commit();

  echo json_encode(["ok" => true]);

} catch (Exception $e) {
  if (isset($conn) && $conn instanceof mysqli) {
    $conn->rollback();
  }
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
