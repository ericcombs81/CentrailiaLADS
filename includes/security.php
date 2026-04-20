<?php
// includes/security.php
declare(strict_types=1);

const APP_SESSION_LIFETIME = 60 * 60 * 24 * 365 * 10; // 10 years

function security_is_https(): bool {
  if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
  if (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443) return true;
  // If behind a reverse proxy / SSL terminator, you may need:
  // if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') return true;
  return false;
}

function security_bootstrap(): void {
  $isHttps = security_is_https();

  ini_set('session.use_strict_mode', '1');
  ini_set('session.use_only_cookies', '1');
  ini_set('session.cookie_httponly', '1');
  ini_set('session.cookie_secure', $isHttps ? '1' : '0');
  ini_set('session.gc_maxlifetime', (string)APP_SESSION_LIFETIME);
  ini_set('session.cookie_lifetime', (string)APP_SESSION_LIFETIME);

  session_set_cookie_params([
    'lifetime' => APP_SESSION_LIFETIME,
    'path' => '/',
    'domain' => '',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
  ]);

  if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
  }

  // Bind to user agent (lightweight)
  $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
  $uaHash = hash('sha256', $ua);
  if (!isset($_SESSION['__ua'])) {
    $_SESSION['__ua'] = $uaHash;
  } elseif (!hash_equals((string)$_SESSION['__ua'], $uaHash)) {
    security_logout();
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Session invalid']);
    exit;
  }
}

function security_on_login_success(): void {
  session_regenerate_id(true); // prevent fixation
  $_SESSION['__login_time'] = time();
  $_SESSION['__last_activity'] = time();
  unset($_SESSION['csrf_token']); // rotate CSRF on login
}

function security_logout(): void {
  $_SESSION = [];

  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
      $params['path'] ?? '/',
      $params['domain'] ?? '',
      (bool)($params['secure'] ?? false),
      (bool)($params['httponly'] ?? true)
    );
  }

  if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
  }
}

function csrf_token(): string {
  if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
  }
  return (string)$_SESSION['csrf_token'];
}

function csrf_check(string $token): bool {
  if ($token === '' || empty($_SESSION['csrf_token'])) return false;
  return hash_equals((string)$_SESSION['csrf_token'], $token);
}

function csrf_verify_or_die(): void {
  $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
  if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) return;

  $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? ''));

  if ($token === '' || empty($_SESSION['csrf_token']) || !hash_equals((string)$_SESSION['csrf_token'], $token)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'CSRF validation failed']);
    exit;
  }
}

function security_headers_json(): void {
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
}

function security_headers_html(?string $nonce = null): void {
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: same-origin');
  header('X-Frame-Options: DENY');

  $scriptSrc = "script-src 'self'";
  if ($nonce) {
    $scriptSrc .= " 'nonce-{$nonce}'";
  }

  header(
    "Content-Security-Policy:" .
    "default-src 'self';" .
    "img-src 'self' data:;" .
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" .
    "font-src 'self' https://fonts.gstatic.com;" .
    $scriptSrc . ";" .
    "base-uri 'self';" .
    "frame-ancestors 'none'"
  );
}
