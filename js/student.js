export async function initStudentPage() {
  // Default to today's date in Central Time
  const now = new Date();
  const central = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const dateField = document.getElementById('date');
  if (dateField) dateField.value = central.toISOString().split('T')[0];

  await loadActiveStudentsIntoDropdown();

    // Load default behaviors from DB (is_default = 1), ordered by behavior_id
  const tbody = document.getElementById("behaviorBody");
  if (!tbody) return;

  tbody.innerHTML = ""; // clear old rows

  let behaviors = [];
  try {
    const res = await fetch("api/behaviors/list.php?v=" + Date.now(), { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load behaviors");

    behaviors = (json.data || [])
      .filter(b => Number(b.is_default) === 1)
      .sort((a, b) => Number(a.behavior_id) - Number(b.behavior_id));
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="11" style="color:red;">⚠ Failed to load behaviors</td></tr>`;
    return;
  }

  behaviors.forEach((b) => {
    const row = document.createElement("tr");

    const behaviorCell = document.createElement("td");
    behaviorCell.textContent = b.behavior_text;
    behaviorCell.classList.add("behavior-label");
    row.appendChild(behaviorCell);

    // 10 checkboxes (periods 1–10)
    for (let i = 1; i <= 10; i++) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      // Use real behavior_id (NOT rowIndex) so this can map cleanly to DB later
      checkbox.name = `b${b.behavior_id}_p${i}`;
      checkbox.classList.add("period-check");

      td.appendChild(checkbox);
      row.appendChild(td);
    }

    tbody.appendChild(row);
  });
  
}

async function loadActiveStudentsIntoDropdown() {
  const sel = document.getElementById("student");
  if (!sel) return;

  // Reset to placeholder
  sel.innerHTML = `<option value="">Select student...</option>`;

  try {
    const res = await fetch("api/student/list.php", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load students");

    // Keep only active (statusValue === 1), already sorted by last/first from SQL
    const active = (json.data || []).filter(s => Number(s.statusValue) === 1);

    active.forEach(s => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = `${s.first} ${s.last}`; // First + " " + Last
      sel.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "⚠ Failed to load students";
    sel.appendChild(opt);
  }
}
