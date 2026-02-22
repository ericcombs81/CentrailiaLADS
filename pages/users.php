<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/users.css">

<div class="users-page">
  <div class="header-row">
    <h2>Users</h2>
    <button id="addUserBtn" class="btn-add">+ Add User</button>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <!-- ✅ ID column removed -->
          <th class="sortable" data-key="first">First Name</th>
          <th class="sortable" data-key="last">Last Name</th>
          <th class="sortable" data-key="email">Email</th>
          <th class="sortable" data-key="role">Role</th>
          <th class="center">Edit</th>
          <th class="center">Delete</th>
        </tr>
      </thead>
      <tbody id="usersTableBody"></tbody>
    </table>
  </div>

  <!-- Add User Modal -->
  <div class="modal" id="addUserModal">
    <div class="modal-content">
      <span class="close-btn" id="addUserCloseBtn">&times;</span>
      <h3>Add User</h3>

      <form id="addUserForm">
        <div class="form-grid">
          <label for="addFirst">First Name:</label>
          <input type="text" id="addFirst" required>

          <label for="addLast">Last Name:</label>
          <input type="text" id="addLast" required>

          <label for="addEmail">Email:</label>
          <input type="email" id="addEmail" required>

          <label for="addRole">Role:</label>
          <select id="addRole" required>
            <option value="Teacher">Teacher</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        <button type="submit" class="btn-submit">Create User</button>
        <div class="temp-pass" id="tempPassBox" style="display:none;"></div>
      </form>
    </div>
  </div>

  <!-- Edit User Modal -->
  <div class="modal" id="editUserModal">
    <div class="modal-content">
      <span class="close-btn" id="editUserCloseBtn">&times;</span>
      <h3>Edit User</h3>

      <form id="editUserForm">
        <input type="hidden" id="editId">

        <div class="form-grid">
          <label for="editFirst">First Name:</label>
          <input type="text" id="editFirst" required>

          <label for="editLast">Last Name:</label>
          <input type="text" id="editLast" required>

          <label for="editEmail">Email:</label>
          <input type="email" id="editEmail" required>

          <label for="editRole">Role:</label>
          <select id="editRole" required>
            <option value="Teacher">Teacher</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        <button type="submit" class="btn-submit">Save Changes</button>
      </form>
    </div>
  </div>
</div>
