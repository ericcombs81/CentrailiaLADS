<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/student-master.css?v=6">

<div class="student-master">
  <div class="header-row">
  <h2>Student Master</h2>

  <div class="header-actions">
    <button id="gradePlusBtn" class="btn-add btn-secondary">Grade +</button>
    <button id="gradeMinusBtn" class="btn-add btn-secondary">Grade -</button>
    <button id="addStudentBtn" class="btn-add">+ Enroll New Student</button>
  </div>
</div>

  <div class="table-container">
    <table>
      <thead>
  <tr>
    <th class="sortable" data-key="last">Last Name</th>
    <th class="sortable" data-key="first">First Name</th>
    <th class="sortable" data-key="grade">Grade</th>
    <th>
      Status
      <select id="statusFilter">
        <option value="all">All</option>
        <option value="Active" selected>Active</option>
        <option value="Inactive">Inactive</option>
      </select>
    </th>
    <th>Action</th>
  </tr>
</thead>


      <tbody id="studentTableBody"></tbody>
    </table>
  </div>
</div>

<div class="modal" id="enrollModal">
  <div class="modal-content">
    <span class="close-btn">&times;</span>
    <h3>Enroll New Student</h3>

    <form id="enrollForm">
  <div class="form-grid">
    <label for="firstInput">First Name:</label>
    <input type="text" id="firstInput" required>

    <label for="lastInput">Last Name:</label>
    <input type="text" id="lastInput" required>

    <label for="gradeInput">Grade:</label>
    <input type="number" id="gradeInput" min="0" max="12" required>
  </div>

  <button type="submit" class="btn-submit">Enroll</button>
</form>

  </div>
</div>

<!-- ✅ Edit Student Modal should be completely separate -->
<div id="editModal" class="modal">
  <div class="modal-content">
    <span class="close-btn" id="editCloseBtn">&times;</span>
    <h3 style="margin:0; color:#cc0100;">Edit Student</h3>

    <form id="editForm">
      <input type="hidden" id="editId" />

      <div class="form-grid">
        <label for="editLast">Last Name</label>
        <input type="text" id="editLast" required />

        <label for="editFirst">First Name</label>
        <input type="text" id="editFirst" required />

        <label for="editGrade">Grade</label>
        <input type="number" id="editGrade" min="0" max="12" required />

        <label for="editStatus">Status</label>
        <select id="editStatus" required>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      <button type="submit" class="btn-submit">Save Changes</button>
    </form>
  </div>
</div>

  </div>
</div>

