<?php
declare(strict_types=1);

require_once __DIR__ . "/config/db.php";
header("Content-Type: text/html; charset=utf-8");

$email = "eric1981combs@gmail.com";
$first = "Eric";
$last  = "Combs";
$role  = "Admin";
$passwordPlain = "SuperUser";

try {
  if (!isset($conn) || !($conn instanceof mysqli)) {
    throw new RuntimeException("Database connection (\$conn) not available. Check config/db.php");
  }
  if ($conn->connect_errno) {
    throw new RuntimeException("DB connect failed: " . $conn->connect_error);
  }

  $hash = password_hash($passwordPlain, PASSWORD_DEFAULT);

  // Does the user already exist?
  $check = $conn->prepare("SELECT ID FROM users WHERE email = ?");
  if (!$check) throw new RuntimeException("Prepare failed (check): " . $conn->error);

  $check->bind_param("s", $email);
  $check->execute();
  $check->store_result();

  if ($check->num_rows > 0) {
    // Update existing user
  // If the DB supports forced password changes, ensure admin is NOT forced.
  $hasMustChange = false;
  if ($colsRes = $conn->query("SHOW COLUMNS FROM users LIKE 'must_change_password'")) {
    $hasMustChange = ($colsRes->num_rows > 0);
  }

  $upd = $hasMustChange
    ? $conn->prepare("UPDATE users SET first=?, last=?, role=?, password_hash=?, must_change_password=0 WHERE email=?")
    : $conn->prepare("UPDATE users SET first=?, last=?, role=?, password_hash=? WHERE email=?");
    if (!$upd) throw new RuntimeException("Prepare failed (update): " . $conn->error);

    $upd->bind_param("sssss", $first, $last, $role, $hash, $email);

    if (!$upd->execute()) {
      throw new RuntimeException("Update failed: " . $upd->error);
    }

    echo "Admin user UPDATED successfully.<br>";
  } else {
    // Insert new user
  $hasMustChange = false;
  if ($colsRes = $conn->query("SHOW COLUMNS FROM users LIKE 'must_change_password'")) {
    $hasMustChange = ($colsRes->num_rows > 0);
  }

  $ins = $hasMustChange
    ? $conn->prepare("INSERT INTO users (email, first, last, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?, 0)")
    : $conn->prepare("INSERT INTO users (email, first, last, password_hash, role) VALUES (?, ?, ?, ?, ?)");
    if (!$ins) throw new RuntimeException("Prepare failed (insert): " . $conn->error);

    $ins->bind_param("sssss", $email, $first, $last, $hash, $role);

    if (!$ins->execute()) {
      throw new RuntimeException("Insert failed: " . $ins->error);
    }

    echo "Admin user CREATED successfully.<br>";
  }

  echo "<br><b>Now DELETE THIS FILE from the server.</b>";

} catch (Throwable $e) {
  http_response_code(500);
  echo "Error creating admin user.<br>";

  // Temporary: show real error so you can fix it quickly
  // After it works once, delete this whole file anyway.
  echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";

  echo "<br><b>DELETE THIS FILE IMMEDIATELY AFTER RUNNING.</b>";
}