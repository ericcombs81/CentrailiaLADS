<?php
// pages/report-point-sheets.php
?>

<link rel="stylesheet" href="css/student.css?v=<?= filemtime(__DIR__ . "/../css/student.css") ?>">
<link rel="stylesheet" href="css/report-point-sheets.css?v=<?= filemtime(__DIR__ . "/../css/report-point-sheets.css") ?>">

<div class="rps-page">
  <h2>Daily Point Sheets</h2>

  <div class="rps-toolbar">
    <div class="rps-tool">
      <label for="rpsDate">Date:</label>
      <input type="date" id="rpsDate">
    </div>

    <div class="rps-actions">
      <button id="rpsPrint" class="btn-secondary" disabled>Print</button>
      <span id="rpsCount" class="rps-count"></span>
    </div>
  </div>

  <!-- Hidden on screen; shown during print -->
  <div id="rpsPrintArea" class="rps-print-area" aria-label="Point Sheets Print Area"></div>
</div>

