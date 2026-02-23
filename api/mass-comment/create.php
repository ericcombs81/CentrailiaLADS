<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

try {
  $body = json_decode(file_get_contents("php://input"), true) ?: [];

  $date = $body["comment_date"] ?? "";
  $text = trim($body["comment_text"] ?? "");

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) throw new Exception("Invalid date");
  if ($text === "") throw new Exception("Comment text required");

  $conn->begin_transaction();

  // 1) Store the mass comment record
  $stmt = $conn->prepare("INSERT INTO `mass_comments`(`comment_date`, `comment_text`) VALUES(?, ?)");
  $stmt->bind_param("ss", $date, $text);
  if (!$stmt->execute()) throw new Exception($stmt->error);

  $id = (int)$conn->insert_id;

  // Tag so we can edit/delete later reliably
  $prefix = "[[MC:$id]] " . $text . "\n\n";

  // 2) Ensure a session exists for EVERY ACTIVE student for that date
  $sqlInsertSessions = "
    INSERT INTO `behavior_sessions` (`student_id`, `session_date`, `comments`)
    SELECT s.`ID`, ?, ''
    FROM `student` s
    WHERE s.`status` = 1
      AND NOT EXISTS (
        SELECT 1 FROM `behavior_sessions` bs
        WHERE bs.`student_id` = s.`ID` AND bs.`session_date` = ?
      )
  ";
  $stmtIns = $conn->prepare($sqlInsertSessions);
  $stmtIns->bind_param("ss", $date, $date);
  if (!$stmtIns->execute()) throw new Exception($stmtIns->error);

  // 3) Prepend the tag+comment (ACTIVE students only)
  //    (and guard against double-apply)
  $sqlPrepend = "
    UPDATE `behavior_sessions` bs
    JOIN `student` s ON s.`ID` = bs.`student_id`
    SET bs.`comments` = CASE
      WHEN bs.`comments` LIKE CONCAT('%[[MC:', ?, ']]%') THEN bs.`comments`
      ELSE CONCAT(?, IFNULL(bs.`comments`, ''))
    END
    WHERE bs.`session_date` = ?
      AND s.`status` = 1
  ";
  $stmtUp = $conn->prepare($sqlPrepend);
  $stmtUp->bind_param("iss", $id, $prefix, $date);
  if (!$stmtUp->execute()) throw new Exception($stmtUp->error);

  $conn->commit();

  echo json_encode(["ok" => true, "id" => $id]);

} catch (Throwable $e) {
  if (isset($conn)) { try { $conn->rollback(); } catch (Throwable $x) {} }
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}