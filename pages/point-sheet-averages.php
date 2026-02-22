<?php
// pages/point-sheet-averages.php
// (No JSON headers here — this is HTML that gets injected into #content)
?>

<div class="report-psa">
  <div class="report-header">
    <h2>Point Sheet Averages</h2>
  </div>

  <div class="report-body">
    <!-- Left controls -->
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
          <option value="">Select student...</option>
        </select>
      </div>

      <div class="buttons">
        <button id="btnPrint" class="btn-secondary">Print</button>
      </div>
    </section>

    <!-- Right preview -->
    <section class="report-preview" aria-label="Report Preview">
      <div class="paper">
        <header class="paper-head">
          <div class="paper-title">
            <div class="paper-school">Centralia H.S. Annex</div>
            <div class="paper-report">Point Sheet Averages</div>
          </div>

          <div class="paper-meta">
            <div><strong>Student:</strong> <span id="metaStudent">—</span></div>
            <div><strong>Range:</strong> <span id="metaRange">—</span></div>
          </div>
        </header>

        <div class="chart-wrap">
          <svg id="avgChart" class="chart" viewBox="0 0 680 300" role="img" aria-label="Point sheet averages chart"></svg>
        </div>

        <footer class="paper-foot">
          <span>Page 1 of 1</span>
          <span class="legend"><span class="dot"></span> PERCENT</span>
        </footer>
      </div>
    </section>
  </div>
</div>
