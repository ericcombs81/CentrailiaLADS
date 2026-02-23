<?php
// pages/point-sheet-averages-summary.php
?>
<link rel="stylesheet" href="css/point-sheet-averages-summary.css?v=<?= filemtime(__DIR__ . '/../css/point-sheet-averages-summary.css') ?>">

<section class="report-avg-summary" aria-label="Point Sheet Averages Summary Report">
  <div class="report-header">
    <h2>Point Sheet Averages</h2>
  </div>

  <div class="report-body">
    <!-- LEFT CONTROLS -->
    <div class="report-controls">
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

      <div class="buttons">
        <button class="btn-secondary" id="btnPrint" type="button">Print</button>
      </div>
    </div>

    <!-- RIGHT PREVIEW (this is what we export to PDF) -->
    <section class="report-preview" aria-label="Report Preview">
      <div class="paper" id="avgSummaryPaper">
        <div class="paper-head">
          <div class="paper-title">
            <div class="paper-school">Centralia H.S. Annex</div>
            <div class="paper-report">Point Sheet Averages</div>
          </div>

          <div class="paper-meta">
            <div><strong>Student:</strong> <span id="metaStudent">—</span></div>
            <div><strong>Range:</strong> <span id="metaRange">—</span></div>
          </div>
        </div>

        <div class="summary-body">
          <div class="summary-table">
            <div class="summary-header">
              <div class="h-left">Behaviors</div>
              <div class="h-right">Average %</div>
            </div>

            <div id="summaryRows" class="summary-rows">
              <!-- rows injected here -->
            </div>

            <div class="summary-total">
              <div class="t-label">Total Average %:</div>
              <div class="t-value" id="totalAvg">—</div>
            </div>
          </div>
        </div>

        <div class="paper-foot">
          <div>Page 1 of 1</div>
          
        </div>
      </div>
    </section>
  </div>
</section>