<?php
declare(strict_types=1);

require_once __DIR__ . "/config/db.php";
require_once __DIR__ . "/auth.php";

if (is_logged_in()) {
  header("Location: index.php");
  exit;
}

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $email = trim($_POST["email"] ?? "");
  $password = (string)($_POST["password"] ?? "");

  if ($email === "" || $password === "") {
    $error = "Please enter your email and password.";
  } else {
    // Some installs have a must_change_password column to force first-login password change.
    $hasMustChange = false;
    if ($colsRes = $conn->query("SHOW COLUMNS FROM users LIKE 'must_change_password'")) {
      $hasMustChange = ($colsRes->num_rows > 0);
    }

    $sql = $hasMustChange
      ? "SELECT id, email, first, last, password_hash, role, must_change_password FROM users WHERE email = ? LIMIT 1"
      : "SELECT id, email, first, last, password_hash, role FROM users WHERE email = ? LIMIT 1";

    $stmt = $conn->prepare($sql);
    if ($stmt) {
      $stmt->bind_param("s", $email);
      $stmt->execute();
      $res = $stmt->get_result();
      $u = $res ? $res->fetch_assoc() : null;

      if ($u && password_verify($password, $u["password_hash"])) {
        // Login OK
        $_SESSION["user_id"] = (int)$u["id"];
        $_SESSION["email"] = $u["email"];
        $_SESSION["first"] = $u["first"];
        $_SESSION["last"]  = $u["last"];
        $_SESSION["role"]  = $u["role"];

        // Force password change flow
        $_SESSION["must_change_password"] = $hasMustChange ? (int)($u["must_change_password"] ?? 0) : 0;

        // If the user logged in with the shared temporary password, force a change even if the DB does not have a flag column.
        if (strcasecmp($password, "Centralia") === 0) {
          $_SESSION["must_change_password"] = 1;
        }

        if (!empty($_SESSION["must_change_password"])) {
          header("Location: change_password.php");
          exit;
        }

        header("Location: index.php");
        exit;
      } else {
        $error = "Invalid email or password.";
      }
      $stmt->close();
    } else {
      $error = "Server error (login).";
    }
  }
}
?>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Login</title>
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/login.css">
</head>
<body>

<div class="header-top">
  <div class="profile">
    
  </div><div class="userName"></div>
</div>

<!-- White section with logo and school name -->
<header class="header-main">
  <img src="logo.png" class="logo" alt="Logo">
  <div class="school-name">
    <h1>Centralia Behavior Management App</h1>
  </div>
</header>

<!-- Navigation bar -->
<nav class="nav-bar">
  <ul>
    <li><span class="nav-label">Login</span></li>
  </ul>
</nav>

<main id="content" class="loaded">
  <div class="modal login-modal" style="display:flex;">
    <div class="modal-content login-modal-content">
      <h2 class="login-title">Sign In</h2>

      <?php if ($error !== ""): ?>
        <div class="login-error"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>

      <form method="POST" class="login-form" autocomplete="off">
        <label>Email</label>
        <input type="email" name="email" required>

        <label>Password</label>
        <input type="password" name="password" required>

        <button type="submit" class="btn-submit login-btn">Login</button>
      </form>
    </div>
  </div>
</main>

</body>
</html>