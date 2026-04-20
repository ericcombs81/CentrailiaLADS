<?php
declare(strict_types=1);

require_once __DIR__ . "/auth.php";
require_login();

require_once __DIR__ . "/config/db.php";

// CSP + security headers
security_headers_html();

// CSRF token for the form
$csrf = csrf_token();

$u = current_user();

$error = "";

// Handle POST (no JS required)
if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST") {

  // CSRF check (will exit with JSON by default in your current helper)
  // We want HTML here, so do a manual check instead:
  $postedToken = (string)($_POST["csrf_token"] ?? "");
  if (!csrf_check($postedToken)) {
    $error = "Security check failed. Please refresh and try again.";
  } else {
    $p1 = (string)($_POST["password"] ?? "");
    $p2 = (string)($_POST["password2"] ?? "");

    $p1 = trim($p1);
    $p2 = trim($p2);

    if ($p1 === "" || $p2 === "") {
      $error = "Please enter both password fields.";
    } elseif ($p1 !== $p2) {
      $error = "Passwords do not match.";
    } elseif (strlen($p1) < 8) {
      $error = "Password must be at least 8 characters.";
    } else {

      $userId = (int)($_SESSION["user_id"] ?? 0);
      if ($userId <= 0) {
        $error = "Not logged in.";
      } else {
        $hash = password_hash($p1, PASSWORD_DEFAULT);
        if ($hash === false) {
          $error = "Server error.";
        } else {
          $stmt = $conn->prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?");
          $stmt->bind_param("si", $hash, $userId);

          if ($stmt->execute()) {
            // ✅ Redirect to main app
            $_SESSION["must_change_password"] = 0;   // <-- add this
            header("Location: index.php");
            exit;
          } else {
            error_log("Change password failed for user {$userId}: " . $stmt->error);
            $error = "Server error.";
          }
        }
      }
    }
  }

  // If we got here, we had an error. Issue a fresh CSRF token.
  $csrf = csrf_token();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Change Password</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/login.css">
  <style>
    .cp-note { font-size: 0.95rem; color: #444; margin: 10px 0 18px; line-height: 1.3; }
    .cp-note b { color:#b00000; }
  </style>
</head>
<body>

<div class="header-top">
  <div class="profile"></div>
</div>

<header class="header-main">
  <img src="logo.png" class="logo" alt="Logo">
  <div class="school-name">
    <h1>Centralia Behavior Management App</h1>
  </div>
</header>

<nav class="nav-bar">
  <ul>
    <li><span class="nav-label">Change Password</span></li>
  </ul>
</nav>

<main id="content" class="loaded">
  <div class="modal login-modal" style="display:flex;">
    <div class="modal-content login-modal-content">
      <h2 class="login-title">Change Password</h2>
      <div class="cp-note">
        Your account is using a temporary password (<b>Centralia</b>).<br>
        Please set a new password to continue.
      </div>

      <?php if ($error !== ""): ?>
        <div class="login-error" style="display:block;"><?= htmlspecialchars($error, ENT_QUOTES, "UTF-8") ?></div>
      <?php else: ?>
        <div id="cpError" class="login-error" style="display:none;"></div>
      <?php endif; ?>

      <!-- ✅ POST to self so it works even if JS fails -->
      <form id="cpForm" class="login-form" method="post" action="change_password.php" autocomplete="off">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf, ENT_QUOTES, "UTF-8") ?>">

        <label>New Password</label>
        <input type="password" name="password" required minlength="8">

        <label>Confirm New Password</label>
        <input type="password" name="password2" required minlength="8">

        <button type="submit" class="btn-submit login-btn">Save Password</button>
      </form>
    </div>
  </div>
</main>
<script src="js/change_password.js" defer></script>
</body>
</html>