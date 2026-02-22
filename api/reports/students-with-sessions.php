<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("Database connection not available as \$conn (mysqli).");
  }

  $date = $_GET["date"] ?? "";
  if (!$date) throw new Exception("Missing date");

  $sql = "
    SELECT DISTINCT
      s.ID AS student_id,
      s.last,
      s.first
    FROM behavior_sessions bs
    JOIN student s ON s.ID = bs.student_id
    WHERE bs.session_date = ?
    ORDER BY s.last, s.first
  ";

  $stmt = $conn->prepare($sql);
  if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);

  $stmt->bind_param("s", $date);
  if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);

  $res = $stmt->get_result();
  $rows = [];
  while ($row = $res->fetch_assoc()) $rows[] = $row;

  echo json_encode(["ok" => true, "data" => $rows]);

} catch (Exception $e) {
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}

