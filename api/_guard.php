<?php
// api/_guard.php (shared session helpers for API endpoints)
declare(strict_types=1);

require_once __DIR__ . '/../includes/security.php';
security_bootstrap();
security_headers_json();

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

function api_is_teacher_like_role(string $role): bool {
  return $role === "Teacher" || $role === "Classroom Assistant";
}

function api_require_reports_access(): void {
  if (empty($_SESSION["user_id"])) {
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


function api_require_csrf(): void {
  csrf_verify_or_die();
}
