<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/enrolled-dropped.css">

<div class="enrolled-dropped">
  <div class="header-row">
    <h2>Students Enrolled / Dropped</h2>
  </div>

  <div class="drop-controls">
    <label for="dropDate">Drop all students listed using a drop date of:</label>
    <input type="date" id="dropDate" name="dropDate">
    <button id="dropAllBtn" class="btn-drop">Drop All</button>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th class="sortable" data-key="last">Last Name</th>
          <th class="sortable" data-key="first">First Name</th>
          <th>District</th>
          <th>Grade</th>
          <th>Eligibility</th>
          <th>Enroll Date</th>
          <th>Pending Drop</th>
        </tr>
      </thead>
      <tbody id="enrolledTableBody"></tbody>
    </table>
  </div>
</div>

<script type="module" src="js/enrolled-dropped.js"></script>
