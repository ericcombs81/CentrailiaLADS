<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json; charset=utf-8");

try {
  $id = isset($_GET["id"]) ? (int)$_GET["id"] : 0;

  if ($id > 0) {
    $stmt = $conn->prepare("SELECT `id`, `comment_date`, `comment_text` FROM `mass_comments` WHERE `id`=?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
  } else {
    $res = $conn->query("SELECT `id`, `comment_date`, `comment_text` FROM `mass_comments` ORDER BY `comment_date` DESC, `id` DESC");
    $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
  }

  echo json_encode(["ok" => true, "data" => $rows]);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}