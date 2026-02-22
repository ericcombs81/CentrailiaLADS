<?php
require_once __DIR__ . "/../../config/db.php";
header("Content-Type: application/json");

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new Exception("Database connection not available as \$conn (mysqli).");
  }

  $delta = isset($_POST["delta"]) ? (int)$_POST["delta"] : 0;
  if ($delta !== 1 && $delta !== -1) {
    throw new Exception("Invalid delta. Must be 1 or -1.");
  }

  // NOTE: We allow grade to go beyond 12 or below 1.
  // UI will clamp display to "12+" or "1".
  $sql = "UPDATE student SET grade = grade + ($delta)";

  if (!$conn->query($sql)) {
    throw new Exception("Update failed: " . $conn->error);
  }

  echo json_encode(["ok" => true, "affected" => $conn->affected_rows]);
} catch (Exception $e) {
  echo json_encode(["ok" => false, "error" => $e->getMessage()]);
}