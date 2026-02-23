<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/enrolled-dropped.css?v=3">

<div class="enrolled-dropped">
  <div class="header-row">
    <h2>Students Enrolled / Dropped</h2>
    <button id="dropAllBtn" class="btn-drop">Drop Selected</button>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th class="sortable" data-key="last">Last Name</th>
          <th class="sortable" data-key="first">First Name</th>
          <th class="sortable center" data-key="grade">Grade</th>
          <th class="center">Pending Drop</th>
        </tr>
      </thead>
      <tbody id="enrolledTableBody"></tbody>
    </table>
  </div>
</div>


