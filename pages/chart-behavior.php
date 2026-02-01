<?php
require_once "../config/db.php";
?>

<div class="report-behavior">
  <div class="report-header">
    <h2>Point Sheet Charts by Behavior</h2>
  </div>

  <div class="report-body">
    <!-- Left: Print/Preview controls like the legacy dialog -->
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
        <select id="studentSelect">
          <option value="abdul">Abdulkareem, Arya</option>
          <option value="smith_john">Smith, John</option>
          <option value="doe_jane">Doe, Jane</option>
        </select>
      </div>

      <div class="control-row">
        <label for="behaviorSelect">Behavior:</label>
        <select id="behaviorSelect">
          <option>Remain in area</option>
          <option>Raise hand to speak</option>
          <option>Verbally appropriate with peers</option>
          <option>Physically appropriate with peers</option>
          <option>Follow instructions</option>
        </select>
      </div>

      <div class="buttons">
        <button id="btnPreview" class="btn-primary">Preview</button>
        <button id="btnPrint"   class="btn-secondary">Print</button>
      </div>
    </section>

    <!-- Right: “report” canvas with school header + chart -->
    <section class="report-preview" aria-label="Report Preview">
      <div class="paper">
        <header class="paper-head">
          <div class="paper-title">
            <div class="paper-school">Centralia H.S. Annex</div>
            <div class="paper-report">Point Sheet Charts by Behavior</div>
          </div>
          <div class="paper-meta">
            <div><strong>Student:</strong> <span id="metaStudent">Abdulkareem, Arya</span></div>
            <div><strong>Behavior:</strong> <span id="metaBehavior">Remain in area</span></div>
            <div><strong>Range:</strong> <span id="metaRange">10/01/2025 – 10/09/2025</span></div>
          </div>
        </header>

        <!-- Chart goes here -->
        <div class="chart-wrap">
          <svg id="behaviorChart" class="chart" viewBox="0 0 680 300" role="img" aria-label="Behavior chart"></svg>
        </div>

        <footer class="paper-foot">
          <span>Page 1 of 1</span>
          <span class="legend"><span class="dot"></span> PERCENT</span>
        </footer>
      </div>
    </section>
  </div>
</div>
<script type="module">
  import { initChartByBehaviorPage } from "../js/chart-behavior.js";
  initChartByBehaviorPage();
</script>
