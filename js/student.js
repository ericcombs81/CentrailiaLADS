export function initStudentPage() {
  // Default to today's date in Central Time
  const now = new Date();
  const central = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const dateField = document.getElementById('date');
  if (dateField) dateField.value = central.toISOString().split('T')[0];

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

  const tbody = document.getElementById("behaviorBody");
  if (!tbody) return;

  behaviors.forEach((behavior, rowIndex) => {
    const row = document.createElement("tr");

    const behaviorCell = document.createElement("td");
    behaviorCell.textContent = behavior;
    behaviorCell.classList.add("behavior-label");
    row.appendChild(behaviorCell);

    // 10 checkboxes (1–9 periods + Bus)
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
}
