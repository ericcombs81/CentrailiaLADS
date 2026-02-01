<?php
require_once "../config/db.php";
?>

<link rel="stylesheet" href="css/student.css">
<div class="student-form">
  <h2>Daily Point Sheet</h2>

  <form id="pointForm">
    <!-- Top section -->
    <div class="form-top">
      <div class="form-group">
        <label for="date">Date:</label>
        <input type="date" id="date" name="date">
      </div>

      <div class="form-group">
        <label for="student">Student:</label>
        <select id="student" name="student">
          <option value="">Select student...</option>
          <option value="john">John Smith</option>
          <option value="jane">Jane Doe</option>
          <option value="sam">Sam Wilson</option>
        </select>
      </div>

      <div class="form-group small">
        <label>Present for</label>
        <input type="number" id="periods" name="periods" min="0" max="9">
        <span>periods</span>
      </div>

      <div class="form-group check">
        <label><input type="checkbox" id="bus"> Rode the Bus</label>
      </div>
      <div class="form-group check">
        <label><input type="checkbox" id="unexcused"> Unexcused</label>
      </div>
    </div>

    <!-- Behavior table -->
    <div class="behavior-table">
      <table>
        <thead>
          <tr>
            <th>Observed Behavior</th>
            <th>1st</th><th>2nd</th><th>3rd</th><th>4th</th>
            <th>5th</th><th>6th</th><th>7th</th><th>8th</th>
            <th>9th</th><th>Bus</th>
          </tr>
        </thead>
        <tbody id="behaviorBody"></tbody>
      </table>
    </div>

    <!-- Comments -->
    <div class="form-comments">
      <label for="comments">Comments:</label>
      <textarea id="comments" rows="4"></textarea>
    </div>
  </form>
</div>

<script>
document.addEventListener("DOMContentLoaded", () => {
  // Default to today's date in Central Time
  const now = new Date();
  const central = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  document.getElementById('date').value = central.toISOString().split('T')[0];

  // Behavior list
  const behaviors = [
    "Remain in area",
    "Raise hand to speak",
    "Verbally appropriate with peers",
    "Physically appropriate with peers",
    "Verbally appropriate with staff",
    "Physically appropriate with staff",
    "Physically appropriate with objects",
    "Follow instructions",
    "Attempt work / pay attention",
    "Prepared for class / homework"
  ];

  // Generate rows dynamically with 10 columns of checkboxes (9 periods + Bus)
  const tbody = document.getElementById("behaviorBody");

  behaviors.forEach((behavior, rowIndex) => {
    const row = document.createElement("tr");

    const behaviorCell = document.createElement("td");
    behaviorCell.textContent = behavior;
    behaviorCell.classList.add("behavior-label");
    row.appendChild(behaviorCell);

    // 10 checkboxes (1–9 periods + bus)
    for (let i = 1; i <= 10; i++) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = `b${rowIndex + 1}_p${i}`;
      checkbox.classList.add("period-check");
      td.appendChild(checkbox);
      row.appendChild(td);
    }

    tbody.appendChild(row);
  });
});
</script>
