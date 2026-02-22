<?php
require_once "config/db.php";
?>

<html lang="en">
<head>
<meta charset="UTF-8">
<title>LADS App</title>
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/chart-behavior.css">
<link rel="stylesheet" href="css/point-sheet-averages.css">
<link rel="stylesheet" href="css/calendar.css">
<link rel="stylesheet" href="css/report-point-sheets.css">


</head>
<body>

<!-- Top thin red line with arc -->
<div class="header-top">
  <div class="profile">
    <div class="userName">User Name</div>
  </div>
</div>


<!-- White section with logo and school name -->
<header class="header-main">
  <img src="logo.png" class="logo" alt="Logo">
  <div class="school-name">
    <h1>Centralia Behavior Management Tracker</h1>
  </div>
</header>

<!-- Navigation bar -->
<nav class="nav-bar">
  <ul>
    <!-- Regular link -->
    <li><a href="#" data-page="student" class="active">Student</a></li>

    <!-- ADMIN Dropdown (no link) -->
    <li class="has-dropdown">
      <span class="nav-label">Admin ▾</span>
      <ul class="dropdown">
        <li><a href="#" data-page="calendar">School Calendar</a></li>
        <li><a href="#" data-page="student-master">Student Master</a></li>
        <li><a href="#" data-page="enrolled-dropped">Students Enrolled / Dropped</a></li>
        <li><a href="#" data-page="behavior">Behaviors</a></li>
        <li><a href="#" data-page="custom-behavior">Customize Behaviors</a></li>
        <li><a href="#" data-page="users">Users</a></li>
      </ul>
    </li>

    <!-- REPORTS Dropdown (no link) -->
    <li class="has-dropdown">
      <span class="nav-label">Reports ▾</span>
      <ul class="dropdown">
        <li><a href="#" data-page="report-point-sheets">Daily Point Sheets</a></li>
        <li><a href="#" data-page="point-sheet-averages">Point Sheet Averages</a></li>
        <li><a href="#" data-page="chart-behavior">Point Sheet Chart by Behavior</a></li>
      </ul>
    </li>
  </ul>
</nav>


  </ul>
</nav>

<main id="content">
</main>

<script type="module" src="js/main.js?v=<?php echo filemtime(__DIR__ . '/js/main.js'); ?>"></script>


</body>
</html>
