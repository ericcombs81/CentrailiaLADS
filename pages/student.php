<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/student.css?v=5">

<div class="student-form">
  <!--<h2>Daily Point Sheet</h2>-->

  <form id="pointForm">
    <div class="form-top">
      <div class="form-group">
        <label for="date">Date:</label>
        <input type="date" id="date" name="date">
      </div>

      <div class="form-group">
        <label for="student">Student:</label>
        <select id="student" name="student">
          <option value="">Select student...</option>
        </select>
      </div>

      <div class="form-group student-search">
        <label for="studentSearch">Search:</label>
        <div class="student-search-wrap">
          <input
            type="text"
            id="studentSearch"
            placeholder="Type a name..."
            autocomplete="off"
          >
          <div id="studentSuggest" class="student-suggest" style="display:none;"></div>
        </div>
      </div>

      <!-- ✅ Right-aligned actions -->
      <div class="student-actions">
        <button class="btn-secondary" id="printDailyPoints" type="button">Print</button>
        <button class="btn-submit" id="submitDailyPoints" type="button">Submit</button>
      </div>
    </div>

    <div class="behavior-table">
      <table>
        <thead>
          <tr>
            <th>Observed Behavior</th>
            <th data-period="1" class="period-toggle">1st</th>
            <th data-period="2" class="period-toggle">2nd</th>
            <th data-period="3" class="period-toggle">3rd</th>
            <th data-period="4" class="period-toggle">4th</th>
            <th data-period="5" class="period-toggle">5th</th>
            <th data-period="6" class="period-toggle">6th</th>
            <th data-period="7" class="period-toggle">7th</th>
            <th data-period="8" class="period-toggle">8th</th>
            <th data-period="9" class="period-toggle">9th</th>
            <th data-period="10" class="period-toggle">Bus</th>
            <th class="total-col">Total %</th>
          </tr>
        </thead>
        <tbody id="behaviorBody"></tbody>

        <tfoot>
          <tr class="totals-row">
            <td class="totals-label"><strong>Total %</strong></td>
            <td class="total-cell" data-period="1">0%</td>
            <td class="total-cell" data-period="2">0%</td>
            <td class="total-cell" data-period="3">0%</td>
            <td class="total-cell" data-period="4">0%</td>
            <td class="total-cell" data-period="5">0%</td>
            <td class="total-cell" data-period="6">0%</td>
            <td class="total-cell" data-period="7">0%</td>
            <td class="total-cell" data-period="8">0%</td>
            <td class="total-cell" data-period="9">0%</td>
            <td class="total-cell" data-period="10">0%</td>
            <td class="overall-cell" id="overallTotalCell"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="total-percentage">
      <strong>Total Percentage:</strong>
      <span id="overallTotal">0%</span>
    </div>

    <div class="form-comments">
      <label for="comments"><strong>Comments:</strong></label>
      <textarea id="comments" name="comments" rows="4" placeholder=""></textarea>
    </div>

    <!-- Print area (hidden on screen; used for clean print output) -->
    <div id="studentPrintArea" class="student-print-area" aria-label="Student Print Area"></div>

    <!-- Print modal -->
    <div id="printModal" class="modal" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="printModalTitle">
        <div class="modal-header">
          <button type="button" class="modal-x" id="printModalClose" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          <div class="print-date-row">
  <label for="printDate"><strong>Date:</strong></label>
  <input type="date" id="printDate">
</div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="printThisStudentBtn">Print This Student</button>
          </div>

          <hr class="modal-sep" />

          <div class="modal-subtitle">Teacher Class (choose students)</div>
          <div class="modal-table-wrap">
            <table class="modal-table" aria-label="Class Print Selection">
              <thead>
                <tr>
                  <th>Print</th>
                  <th>Last</th>
                  <th>First</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody id="classPrintBody"></tbody>
            </table>
          </div>

          <div class="modal-actions" style="justify-content: space-between;">
            <button type="button" class="btn-secondary" id="saveClassSelectionBtn">Save Class Selection</button>
            <button type="button" class="btn-submit" id="printClassBtn">Print Selected</button>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" id="printModalCancel">Cancel</button>
        </div>
      </div>
    </div>

    <script type="module" src="js/student.js?v=<?= filemtime(__DIR__ . '/../js/student.js') ?>"></script>

