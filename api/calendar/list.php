<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("Database connection not available as \$conn (mysqli).");
  }

  $year_start = isset($_GET["year_start"]) ? (int)$_GET["year_start"] : 0;
  if ($year_start < 2000 || $year_start > 2100) throw new Exception("Invalid year_start");

  $start = sprintf("%04d-08-01", $year_start);
  $end   = sprintf("%04d-07-31", $year_start + 1);

  $sql = "
    SELECT calendar_date, no_school, note
    FROM school_calendar_days
    WHERE calendar_date BETWEEN ? AND ?
    ORDER BY calendar_date
  ";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

  $stmt->bind_param("ss", $start, $end);
  if (!$stmt->execute()) throw new Exception("Execute failed: " . $stmt->error);

  $res = $stmt->get_result();
  $rows = [];
  while ($row = $res->fetch_assoc()) $rows[] = $row;

  echo json_encode(["ok" => true, "data" => [
    "year_start" => $year_start,
    "start" => $start,
    "end" => $end,
    "days" => $rows
  ]]);

} catch (Exception $e) {
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}
