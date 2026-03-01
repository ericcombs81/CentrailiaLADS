<?php
declare(strict_types=1);

require_once __DIR__ . "/config/db.php";

$email = "email@email.com";
$first = "Jena";
$last  = "Combs";
$role  = "Teacher";
$passwordPlain = "password"; // You can change this

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new RuntimeException("Database connection not available.");
    }

    $hash = password_hash($passwordPlain, PASSWORD_DEFAULT);

    // Check if user exists
    $check = $conn->prepare("SELECT ID FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        // Update existing
        $upd = $conn->prepare("UPDATE users SET first=?, last=?, role=?, password_hash=? WHERE email=?");
        $upd->bind_param("sssss", $first, $last, $role, $hash, $email);
        $upd->execute();
        echo "Teacher user UPDATED successfully.<br>";
    } else {
        // Insert new
        $ins = $conn->prepare("INSERT INTO users (email, first, last, password_hash, role) VALUES (?, ?, ?, ?, ?)");
        $ins->bind_param("sssss", $email, $first, $last, $hash, $role);
        $ins->execute();
        echo "Teacher user CREATED successfully.<br>";
    }

    echo "<br>DELETE THIS FILE AFTER RUNNING.";

} catch (Throwable $e) {
    http_response_code(500);
    echo "Error creating teacher user.<br>";
    echo "<pre>" . htmlspecialchars($e->getMessage()) . "</pre>";
}