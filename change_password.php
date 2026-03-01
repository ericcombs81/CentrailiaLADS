<?php
declare(strict_types=1);

require_once __DIR__ . "/auth.php";
require_login();

$u = current_user();
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

      <div id="cpError" class="login-error" style="display:none;"></div>

      <form id="cpForm" class="login-form" autocomplete="off">
        <label>New Password</label>
        <input type="password" name="password" required>

        <label>Confirm New Password</label>
        <input type="password" name="password2" required>

        <button type="submit" class="btn-submit login-btn">Save Password</button>
      </form>
    </div>
  </div>
</main>

<script>
document.getElementById("cpForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);

  const errBox = document.getElementById("cpError");
  errBox.style.display = "none";
  errBox.textContent = "";

  const res = await fetch("api/users/change_password.php?v=" + Date.now(), {
    method: "POST",
    body: fd
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch {
    errBox.style.display = "block";
    errBox.textContent = "Server error. Please contact an administrator.";
    return;
  }

  if (!json.ok) {
    errBox.style.display = "block";
    errBox.textContent = json.error || "Unable to change password.";
    return;
  }

  window.location.href = "index.php";
});
</script>

</body>
</html>
