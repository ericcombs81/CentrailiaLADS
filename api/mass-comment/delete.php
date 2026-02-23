<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

try {
  $body = json_decode(file_get_contents("php://input"), true) ?: [];
  $id = (int)($body["id"] ?? 0);
  if ($id <= 0) throw new Exception("Missing id");

  $conn->begin_transaction();

  $stmt = $conn->prepare("SELECT `comment_date`, `comment_text` FROM `mass_comments` WHERE `id`=?");
  $stmt->bind_param("i", $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  if (!$row) throw new Exception("Not found");

  $date = $row["comment_date"];
  $text = $row["comment_text"];
  $prefix = "[[MC:$id]] " . $text . "\n\n";

  $stmt2 = $conn->prepare("
    UPDATE `behavior_sessions`
    SET `comments` = REPLACE(`comments`, ?, '')
    WHERE `session_date` = ?
      AND `comments` LIKE CONCAT('%[[MC:', ?, ']]%')
  ");
  $stmt2->bind_param("ssi", $prefix, $date, $id);
  if (!$stmt2->execute()) throw new Exception($stmt2->error);

  $stmt3 = $conn->prepare("DELETE FROM `mass_comments` WHERE `id`=?");
  $stmt3->bind_param("i", $id);
  if (!$stmt3->execute()) throw new Exception($stmt3->error);

  $conn->commit();
  echo json_encode(["ok" => true]);

} catch (Throwable $e) {
  if (isset($conn)) { try { $conn->rollback(); } catch (Throwable $x) {} }
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}