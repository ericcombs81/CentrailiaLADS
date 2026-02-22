<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/custom-behavior.css?v=1">

<div class="customize-behaviors">
  <div class="header-row">
    <h2>Customize Behaviors</h2>

    <button id="addBehaviorBtn" class="btn-add">+ Add New Behavior</button>
  </div>

  <div class="top-row">
    <div class="student-picker">
      <div class="form-group">
        <label for="studentSearch">Student Search:</label>
        <div class="student-search-wrap">
          <input id="studentSearch" type="text" placeholder="Type a name..." autocomplete="off" />
          <div id="studentSuggest" class="student-suggest"></div>
        </div>
      </div>

      <div class="form-group">
        <label for="student">Student:</label>
        <select id="student">
          <option value="">Select student...</option>
        </select>
      </div>
    </div>

    <div class="totals">
      <div class="total-box">
        <div class="total-label">Total Assigned</div>
        <div id="assignedTotal" class="total-value">0</div>
      </div>

      <button id="saveAssignmentsBtn" class="btn-save" disabled>Save</button>
    </div>
  </div>

  <div id="behaviorSection" style="display:none;">
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Behavior</th>
          <th class="center">Default</th>
          <th class="center">Assigned</th>
        </tr>
      </thead>
      <tbody id="behaviorsBody"></tbody>
    </table>
  </div>
</div>

<div id="assignHint" class="assign-hint" style="display:none;"></div>


<!-- Add Behavior Modal (same idea as behaviors page) -->
<div class="modal" id="addBehaviorModal">
  <div class="modal-content">
    <span class="close-btn" id="closeAddBehavior">&times;</span>
    <h3>Add New Behavior</h3>

    <form id="addBehaviorForm">
      <div class="form-grid">
        <label for="behaviorTextInput">Behavior:</label>
        <input id="behaviorTextInput" type="text" required maxlength="255" />

        <label for="behaviorDefaultInput">Default:</label>
        <select id="behaviorDefaultInput">
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </div>

      <button type="submit" class="btn-submit">Create</button>
    </form>

    <div id="tempPasswordArea" style="display:none;"></div>
  </div>
</div>
