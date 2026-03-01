<?php
// api/_guard.php (shared session helpers for API endpoints)
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

function api_require_login(): void {
  if (empty($_SESSION["user_id"])) {
    http_response_code(401);
    echo json_encode(["ok" => false, "error" => "Unauthorized"]);
    exit;
  }

  // If user must change password, block all API calls except password-change endpoints.
  $must = (int)($_SESSION["must_change_password"] ?? 0);
  if ($must === 1) {
    $self = basename($_SERVER["SCRIPT_NAME"] ?? "");
    $allowed = ["change_password.php", "reset_password.php"]; // reset is admin-only anyway
    if (!in_array($self, $allowed, true)) {
      http_response_code(403);
      echo json_encode(["ok" => false, "error" => "Password change required"]);
      exit;
    }
  }
}

function api_require_admin(): void {
  $role = $_SESSION["role"] ?? "";
  if ($role !== "Admin") {
    http_response_code(403);
    echo json_encode(["ok" => false, "error" => "Forbidden"]);
    exit;
  }
}

function api_require_method(array $allowed): void {
  $m = $_SERVER["REQUEST_METHOD"] ?? "GET";
  if (!in_array($m, $allowed, true)) {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Method not allowed"]);
    exit;
  }
}
