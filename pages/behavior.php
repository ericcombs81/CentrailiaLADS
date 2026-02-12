<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/behavior.css">

<div class="behavior-page">
  <div class="header-row">
    <h2>Behaviors</h2>
    <button id="addBehaviorBtn" class="btn-add">+ Add New Behavior</button>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
  <th class="sortable" data-key="behavior_text">Behavior</th>
  <th class="center">Default</th>
  <th class="center">Edit</th>
</tr>

      </thead>
      <tbody id="behaviorTableBody"></tbody>
    </table>
  </div>

  <!-- Add Modal -->
  <div class="modal" id="addBehaviorModal">
    <div class="modal-content">
      <span class="close-btn" id="addBehaviorCloseBtn">&times;</span>
      <h3>Add New Behavior</h3>

      <form id="addBehaviorForm">
        <div class="form-grid">
          <label for="addBehaviorText">Behavior:</label>
          <input type="text" id="addBehaviorText" maxlength="255" required>

          <label for="addIsDefault">Default:</label>
          <select id="addIsDefault" required>
            <option value="1">Yes</option>
            <option value="0" selected>No</option>
          </select>
        </div>

        <button type="submit" class="btn-submit">Create</button>
      </form>
    </div>
  </div>

  <!-- Edit Modal -->
  <div class="modal" id="editBehaviorModal">
    <div class="modal-content">
      <span class="close-btn" id="editBehaviorCloseBtn">&times;</span>
      <h3>Edit Behavior</h3>

      <form id="editBehaviorForm">
        <input type="hidden" id="editBehaviorId">

        <div class="form-grid">
          <label for="editBehaviorText">Behavior:</label>
          <input type="text" id="editBehaviorText" maxlength="255" required>

          <label for="editIsDefault">Default:</label>
          <select id="editIsDefault" required>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>

        <button type="submit" class="btn-submit">Save Changes</button>
      </form>
    </div>
  </div>
</div>
