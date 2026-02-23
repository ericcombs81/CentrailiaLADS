<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

try {
  $body = json_decode(file_get_contents("php://input"), true) ?: [];
  $id = (int)($body["id"] ?? 0);
  $newText = trim($body["comment_text"] ?? "");

  if ($id <= 0) throw new Exception("Missing id");
  if ($newText === "") throw new Exception("Comment text required");

  $conn->begin_transaction();

  $stmt = $conn->prepare("SELECT `comment_date`, `comment_text` FROM `mass_comments` WHERE `id`=?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) throw new Exception("Not found");

  $date = $row["comment_date"];
  $oldText = $row["comment_text"];

  $oldPrefix = "[[MC:$id]] " . $oldText . "\n\n";
  $newPrefix = "[[MC:$id]] " . $newText . "\n\n";

  $stmt2 = $conn->prepare("UPDATE `mass_comments` SET `comment_text`=? WHERE `id`=?");
  $stmt2->bind_param("si", $newText, $id);
  if (!$stmt2->execute()) throw new Exception($stmt2->error);

  // Replace the exact tagged block for that ID/date
  $stmt3 = $conn->prepare("
    UPDATE `behavior_sessions`
    SET `comments` = REPLACE(`comments`, ?, ?)
    WHERE `session_date` = ?
      AND `comments` LIKE CONCAT('%[[MC:', ?, ']]%')
  ");
  $stmt3->bind_param("sssi", $oldPrefix, $newPrefix, $date, $id);
  if (!$stmt3->execute()) throw new Exception($stmt3->error);

  $conn->commit();
  echo json_encode(["ok" => true]);

} catch (Throwable $e) {
  if (isset($conn)) { try { $conn->rollback(); } catch (Throwable $x) {} }
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}