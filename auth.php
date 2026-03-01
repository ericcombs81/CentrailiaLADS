<?php
// auth.php (shared session helpers for page requests)
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_start();
}

function is_logged_in(): bool {
  return !empty($_SESSION["user_id"]);
}

function current_user(): array {
  return [
    "id" => $_SESSION["user_id"] ?? null,
    "email" => $_SESSION["email"] ?? "",
    "first" => $_SESSION["first"] ?? "",
    "last" => $_SESSION["last"] ?? "",
    "role" => $_SESSION["role"] ?? "",
  ];
}

function require_login(): void {
  if (!is_logged_in()) {
    header("Location: login.php");
    exit;
  }

  // If the account is flagged for a required password change, force them to do it
  // before allowing access to the rest of the app.
  $must = (int)($_SESSION["must_change_password"] ?? 0);
  if ($must === 1) {
    $self = basename($_SERVER["SCRIPT_NAME"] ?? "");
    if ($self !== "change_password.php" && $self !== "logout.php") {
      header("Location: change_password.php");
      exit;
    }
  }
}

function require_admin(): void {
  $role = $_SESSION["role"] ?? "";
  if ($role !== "Admin") {
    http_response_code(403);
    echo "<div style='padding:30px;font-family:Arial,sans-serif;color:#b00000;'>
            <h2>Forbidden</h2>
            <p>You do not have permission to access this page.</p>
          </div>";
    exit;
  }
}
