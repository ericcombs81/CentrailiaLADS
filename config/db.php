<?php
$host = "localhost";
$user = "root";
$pass = "";          // blank by default in XAMPP
$db   = "centralia";

$conn = new mysqli($host, $user, $pass, $db);

// Check connection
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}
