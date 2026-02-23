<?php require_once "../config/db.php"; ?>

<link rel="stylesheet" href="css/mass-comment.css?v=<?= filemtime(__DIR__ . '/../css/mass-comment.css') ?>">

<div class="mass-comment">
  <div class="header-row">
    <h2>Mass Comment</h2>
  </div>

  <div class="mass-form">
    <div class="form-row">
      <label for="mcDate">Date:</label>
      <input type="date" id="mcDate">
    </div>

    <div class="form-row">
      <label for="mcText">Comment:</label>
      <textarea id="mcText" rows="3" placeholder="Type the comment to prepend to ALL students..."></textarea>
    </div>

    <div class="form-row actions">
      <button id="mcSaveBtn" class="btn-primary">Save</button>
      <div id="mcToast" class="toast"></div>
    </div>
  </div>

  <div class="table-wrap">
    <table class="mc-table">
      <thead>
        <tr>
          <th>Comment</th>
          <th class="center">Date</th>
          <th class="center">Edit</th>
          <th class="center">Delete</th>
        </tr>
      </thead>
      <tbody id="mcTableBody">
        <tr><td colspan="4">Loading...</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Edit Modal -->
  <div id="mcEditModal" class="modal">
    <div class="modal-content">
      <div class="modal-head">
        <h3>Edit Mass Comment</h3>
        <button id="mcEditClose" class="x">×</button>
      </div>

      <input type="hidden" id="mcEditId">
      <div class="form-row">
        <label>Date:</label>
        <input type="date" id="mcEditDate" disabled>
      </div>

      <div class="form-row">
        <label>Comment:</label>
        <textarea id="mcEditText" rows="4"></textarea>
      </div>

      <div class="modal-actions">
        <button id="mcEditSave" class="btn-primary">Save</button>
        <button id="mcEditCancel" class="btn-secondary">Cancel</button>
      </div>
    </div>
  </div>
</div>