<?php
require_once __DIR__ . "/../auth.php";
require_login();
require_admin();
require_once "../config/db.php";
?>

<div class="report-behavior">
  <div class="report-header">
    <h2>Point Sheet Charts by Behavior</h2>
  </div>

  <div class="report-body">
    <section class="report-controls" aria-label="Report Controls">
      <div class="control-row">
        <label for="startDate">Start Date:</label>
        <input type="date" id="startDate">
      </div>

      <div class="control-row">
        <label for="endDate">End Date:</label>
        <input type="date" id="endDate">
      </div>

      <div class="control-row">
        <label for="studentSelect">Student:</label>
        <select id="studentSelect"></select>
      </div>

      <div class="control-row">
        <label for="behaviorSelect">Behavior:</label>
        <select id="behaviorSelect"></select>
      </div>

      <div class="buttons">
        <button id="btnPrint"   class="btn-secondary">Print</button>
      </div>
    </section>

    <section class="report-preview" aria-label="Report Preview">
      <div class="paper">
        <header class="paper-head">
          <div class="paper-title">
            <div class="paper-school">Centralia H.S. Annex</div>
            <div class="paper-report">Point Sheet Charts by Behavior</div>
          </div>
          <div class="paper-meta">
            <div><strong>Student:</strong> <span id="metaStudent">—</span></div>
            <div><strong>Behavior:</strong> <span id="metaBehavior">—</span></div>
            <div><strong>Range:</strong> <span id="metaRange">—</span></div>
          </div>
        </header>

        <div class="chart-wrap">
          <svg id="behaviorChart" class="chart" viewBox="0 0 680 300" role="img" aria-label="Behavior chart"></svg>
        </div>

        <footer class="paper-foot">
          <span></span>
          <span class="legend"><span class="dot"></span> PERCENT</span>
        </footer>
      </div>
    </section>
  </div>
</div>
