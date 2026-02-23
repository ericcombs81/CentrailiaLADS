// student.js
// Daily Point Sheet page logic (build behaviors table + live totals)

document.getElementById("pointForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
});

let totalsListenerAttached = false;
let allActiveStudents = []; // [{id, label, first, last}]
let warnedNoStudent = false;

function wireSubmitButton() {
  const btn = document.getElementById("submitDailyPoints");
  if (!btn) return;

  // Prevent duplicates if init runs multiple times
  btn.onclick = (e) => {
    e.preventDefault();          // stops any form submit refresh
    e.stopPropagation();
    submitPointSheet().catch(err => {
      console.error(err);
      alert(err.message);
    });
  };
}

function showToast(message, duration = 1500) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.background = "#0e3cf2";
    toast.style.color = "white";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "10px";
    toast.style.fontWeight = "700";
    toast.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "opacity .2s ease, transform .2s ease";
    toast.style.zIndex = "99999";
    toast.style.pointerEvents = "none";
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  // force reflow so transition always plays
  toast.style.opacity = "0";
  toast.style.transform = "translateY(10px)";
  void toast.offsetHeight;

  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, duration);
}

function attachTotalsListenerOnce() {
  if (totalsListenerAttached) return;
  totalsListenerAttached = true;

  document.addEventListener("change", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("period-check")) {
      const studentSelect = document.getElementById("student");
      const hasStudent = studentSelect && studentSelect.value !== "";

      // ALWAYS block checking if no student selected
      if (!hasStudent) {
        e.target.checked = false; // undo every time

        // Alert only once
        if (!warnedNoStudent) {
          warnedNoStudent = true;
          alert("Please select a student before entering points.");
          studentSelect?.focus();
        }
        return;
      }

      recalcTotals();
    }
  });
}

function recalcTotals() {
  // ---------- ROW TOTALS (right-side Total % column) ----------
  const rows = document.querySelectorAll("#behaviorBody tr");
  rows.forEach((row) => {
    const boxes = row.querySelectorAll("input.period-check");
    const checked = Array.from(boxes).filter((b) => b.checked).length;
    const total = boxes.length;

    const pct = total === 0 ? 0 : Math.round((checked / total) * 100);

    const cell = row.querySelector("td.row-total");
    if (cell) cell.textContent = `${pct}%`;
  });

  // ---------- COLUMN TOTALS (bottom Total % row) ----------
  const totalCells = document.querySelectorAll(".total-cell"); // each has data-period="1..10"
  let overallChecked = 0;
  let overallPossible = 0;

  totalCells.forEach((cell) => {
    const period = cell.dataset.period; // "1".."10"
    if (!period) return;

    const boxes = document.querySelectorAll(`input[name$="_p${period}"]`);
    const checked = Array.from(boxes).filter((b) => b.checked).length;
    const total = boxes.length;

    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
    cell.textContent = `${percent}%`;

    overallChecked += checked;
    overallPossible += total;
  });

  // ---------- OVERALL TOTAL (displayed ONLY under the table) ----------
  const overall =
    overallPossible === 0 ? 0 : Math.round((overallChecked / overallPossible) * 100);

  const overallText = document.getElementById("overallTotal");
  if (overallText) overallText.textContent = `${overall}%`;

  // Keep the bottom-right cell blank on purpose
  const overallCell = document.getElementById("overallTotalCell");
  if (overallCell) overallCell.textContent = "";
}

async function loadActiveStudentsIntoDropdown() {
  const sel = document.getElementById("student");
  if (!sel) return;

  sel.innerHTML = `<option value="">Select student...</option>`;

  try {
    const res = await fetch("api/student/list.php?v=" + Date.now(), { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load students");

    allActiveStudents = (json.data || [])
      .filter((s) => Number(s.statusValue) === 1)
      .map((s) => {
        const first = String(s.first || "").trim();
        const last = String(s.last || "").trim();
        return {
          id: String(s.id),
          first,
          last,
          label: `${last}, ${first}`.trim(),
          // keep grade if your endpoint provides it
          grade: s.grade ?? s.gradeValue ?? s.grade_level ?? ""
        };
      })
      .sort((a, b) => {
        const lastCmp = a.last.localeCompare(b.last);
        if (lastCmp !== 0) return lastCmp;
        return a.first.localeCompare(b.first);
      });

    allActiveStudents.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.label;
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

/**
 * Typeahead search:
 * - As you type, show suggestions under the search box
 * - Student dropdown ONLY changes on click or Enter
 * - Never auto-select when only one match remains
 */
function initStudentTypeahead() {
  const input = document.getElementById("studentSearch");
  const suggest = document.getElementById("studentSuggest");
  const sel = document.getElementById("student");
  if (!input || !suggest || !sel) return;

  let matches = [];
  let activeIndex = 0;

  const normalize = (s) => String(s || "").toLowerCase();

  function filterStudents(q) {
    const query = normalize(q).trim();
    if (!query) return [];

    return allActiveStudents
      .filter((s) => {
        const a = normalize(s.label); // "last, first"
        const b = normalize(`${s.first} ${s.last}`); // "first last"
        return a.includes(query) || b.includes(query);
      })
      .slice(0, 50);
  }

  function render() {
    suggest.innerHTML = "";

    if (!input.value.trim()) {
      suggest.style.display = "none";
      return;
    }

    if (matches.length === 0) {
      const div = document.createElement("div");
      div.className = "student-suggest-empty";
      div.textContent = "No matches";
      suggest.appendChild(div);
      suggest.style.display = "block";
      return;
    }

    matches.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "student-suggest-item" + (idx === activeIndex ? " active" : "");
      div.textContent = s.label;

      div.addEventListener("mousedown", (e) => {
        e.preventDefault(); // prevent blur before selection
        selectStudent(s);   // selection ONLY on click
      });

      suggest.appendChild(div);
    });

    suggest.style.display = "block";
  }

  function refreshMatches() {
    matches = filterStudents(input.value);
    activeIndex = 0;
    render();
  }

  function selectStudent(s) {
    // The ONLY place we update the Student dropdown
    sel.value = s.id;
    input.value = s.label;

    // once student is selected, allow alerts again next time
    warnedNoStudent = false;

    // Trigger your existing autoload logic
    sel.dispatchEvent(new Event("change", { bubbles: true }));

    suggest.style.display = "none";
    suggest.innerHTML = "";
  }

  input.addEventListener("input", refreshMatches);

  input.addEventListener("keydown", (e) => {
    if (suggest.style.display === "none") {
      if (e.key === "ArrowDown") {
        refreshMatches();
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (matches.length === 0) return;
      activeIndex = Math.min(activeIndex + 1, matches.length - 1);
      render();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (matches.length === 0) return;
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length === 0) return;
      selectStudent(matches[activeIndex] || matches[0]);
      return;
    }

    if (e.key === "Escape") {
      suggest.style.display = "none";
      suggest.innerHTML = "";
      return;
    }
  });

  input.addEventListener("focus", refreshMatches);

  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggest.style.display = "none";
      suggest.innerHTML = "";
    }, 120);
  });

  // If user manually changes dropdown, reflect it in the search box
  sel.addEventListener("change", () => {
    const chosen = allActiveStudents.find((s) => s.id === sel.value);
    if (chosen) input.value = chosen.label;
  });
}

export async function initStudentPage() {
  attachTotalsListenerOnce();
  wireSubmitButton();
  attachPeriodHeaderToggleDelegatedOnce();

  // Default to today's date in Central Time
  const now = new Date();
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const dateField = document.getElementById("date");
  if (dateField) dateField.value = central.toISOString().split("T")[0];

  await loadActiveStudentsIntoDropdown();
  initStudentTypeahead();

  // Load default behaviors from DB (is_default = 1), ordered by behavior_id
  const tbody = document.getElementById("behaviorBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  let behaviors = [];
  try {
    const res = await fetch("api/behaviors/list.php?v=" + Date.now(), { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load behaviors");

    behaviors = (json.data || [])
      .filter((b) => Number(b.is_default) === 1)
      .sort((a, b) => Number(a.behavior_id) - Number(b.behavior_id));
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="12" style="color:red;">⚠ Failed to load behaviors</td></tr>`;
    return;
  }

  behaviors.forEach((b) => {
    const row = document.createElement("tr");

    const behaviorCell = document.createElement("td");
    behaviorCell.textContent = b.behavior_text;
    behaviorCell.classList.add("behavior-label");
    row.appendChild(behaviorCell);

    for (let i = 1; i <= 10; i++) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = `b${b.behavior_id}_p${i}`;
      checkbox.classList.add("period-check");

      td.appendChild(checkbox);
      row.appendChild(td);
    }

    const rowTotal = document.createElement("td");
    rowTotal.classList.add("row-total");
    rowTotal.textContent = "0%";
    row.appendChild(rowTotal);

    tbody.appendChild(row);
  });

  wireAutoLoad();
  ensurePeriodHeaderPointers();
  recalcTotals();

  // ✅ Add print wiring at the end so it never blocks student loading
  wirePrintUIOnce();
}

async function renderBehaviorTableFor(student_id, session_date) {
  const tbody = document.getElementById("behaviorBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const commentsEl = document.getElementById("comments");
  if (commentsEl) commentsEl.value = "";

  const res = await fetch(
    `api/student-behaviors/list.php?student_id=${encodeURIComponent(student_id)}&date=${encodeURIComponent(session_date)}&v=${Date.now()}`,
    { cache: "no-store" }
  );

  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to load student behaviors");

  const behaviors = json.data || [];

  behaviors.forEach((b) => {
    const row = document.createElement("tr");

    const behaviorCell = document.createElement("td");
    behaviorCell.textContent = b.behavior_text;
    behaviorCell.classList.add("behavior-label");
    row.appendChild(behaviorCell);

    for (let i = 1; i <= 10; i++) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = `b${b.behavior_id}_p${i}`;
      checkbox.classList.add("period-check");
      td.appendChild(checkbox);
      row.appendChild(td);
    }

    const rowTotal = document.createElement("td");
    rowTotal.classList.add("row-total");
    rowTotal.textContent = "0%";
    row.appendChild(rowTotal);

    tbody.appendChild(row);
  });

  recalcTotals();
}

async function submitPointSheet() {
  const studentSel = document.getElementById("student");
  const dateEl = document.getElementById("date");
  const commentsEl = document.getElementById("comments");

  const student_id = Number(studentSel?.value || 0);
  const session_date = dateEl?.value || "";
  const comments = commentsEl?.value || "";

  if (!student_id) return alert("Select a student first.");
  if (!session_date) return alert("Pick a date first.");

  const checks = document.querySelectorAll("#behaviorBody input.period-check");
  const marks = [];

  checks.forEach(cb => {
    const name = cb.name || "";
    const m = name.match(/^b(\d+)_p(\d+)$/);
    if (!m) return;

    const behavior_id = Number(m[1]);
    const period = Number(m[2]);
    const value = cb.checked ? 1 : 0;

    marks.push({ behavior_id, period, value });
  });

  const payload = { student_id, session_date, comments, marks };

  const res = await fetch("api/point-sheet/create.php?v=" + Date.now(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("Server did not return JSON: " + raw.slice(0, 150)); }

  if (!json.ok) throw new Error(json.error || "Save failed.");
  showToast("Submission Successful!", 1500);
}

async function loadPointSheet(student_id, session_date) {
  const res = await fetch(
    `api/point-sheet/list.php?student_id=${encodeURIComponent(student_id)}&session_date=${encodeURIComponent(session_date)}&v=${Date.now()}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Load failed.");

  const commentsEl = document.getElementById("comments");
  if (commentsEl) commentsEl.value = json.comments || "";

  const checks = document.querySelectorAll("#behaviorBody input.period-check");
  checks.forEach(cb => {
    const key = cb.name;
    cb.checked = (json.marks && json.marks[key] === 1);
  });

  recalcTotals();
}

function wireAutoLoad() {
  const studentSel = document.getElementById("student");
  const dateEl = document.getElementById("date");

  async function go() {
    const sid = Number(studentSel?.value || 0);
    const dt = dateEl?.value || "";
    if (!sid || !dt) return;

    try {
      await renderBehaviorTableFor(sid, dt);
      await loadPointSheet(sid, dt);
    } catch (err) {
      console.error(err);
    }
  }

  studentSel?.addEventListener("change", go);
  dateEl?.addEventListener("change", go);
}

function ensurePeriodHeaderPointers() {
  document.querySelectorAll(".behavior-table thead th.period-toggle").forEach((th) => {
    th.style.cursor = "pointer";
  });
}

let periodHeaderDelegatedAttached = false;

function attachPeriodHeaderToggleDelegatedOnce() {
  if (periodHeaderDelegatedAttached) return;
  periodHeaderDelegatedAttached = true;

  document.addEventListener("click", (e) => {
    const th = e.target.closest(".behavior-table thead th.period-toggle");
    if (!th) return;

    th.style.cursor = "pointer";

    const studentSelect = document.getElementById("student");
    const hasStudent = studentSelect && studentSelect.value !== "";
    if (!hasStudent) {
      if (!warnedNoStudent) {
        warnedNoStudent = true;
        alert("Please select a student before entering points.");
        studentSelect?.focus();
      }
      return;
    }

    const period = Number(th.dataset.period || 0);
    if (!period || period < 1 || period > 10) return;

    const boxes = Array.from(
      document.querySelectorAll(`#behaviorBody input.period-check[name$="_p${period}"]`)
    );
    if (boxes.length === 0) return;

    const allChecked = boxes.every((b) => b.checked);
    const newState = !allChecked;

    boxes.forEach((b) => {
      b.checked = newState;
    });

    recalcTotals();
  });
}

/* ============================================================
   PRINT SUPPORT (does NOT interfere with student loading)
   ============================================================ */

let printUiWired = false;

function openModal() {

  const modalDateEl = document.getElementById("printDate");
const pageDateEl = document.getElementById("date");

if (modalDateEl && pageDateEl) {
  modalDateEl.value = pageDateEl.value || "";
}
  const modal = document.getElementById("printModal");
  if (!modal) return;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("printModal");
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}

async function fetchJsonText(url, opts = {}) {
  const res = await fetch(url, { cache: "no-store", ...opts });
  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("Server did not return JSON: " + raw.slice(0, 200)); }
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}

async function loadClassTable() {
  const tbody = document.getElementById("classPrintBody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  const json = await fetchJsonText("api/student/list.php?v=" + Date.now());

  const list = (json.data || [])
    .filter(s => Number(s.statusValue) === 1) // active only
    .map(s => ({
      id: String(s.id),
      last: String(s.last || ""),
      first: String(s.first || ""),
      grade: s.grade ?? s.gradeValue ?? s.grade_level ?? ""
    }))
    .sort((a,b) => (a.last.localeCompare(b.last) || a.first.localeCompare(b.first)));

  tbody.innerHTML = "";
  for (const s of list) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;"><input type="checkbox" value="${escapeHtml(s.id)}"></td>
      <td>${escapeHtml(s.last)}</td>
      <td>${escapeHtml(s.first)}</td>
      <td>${escapeHtml(String(s.grade))}</td>
    `;
    tbody.appendChild(tr);
  }

  // Restore saved selection
  const saved = JSON.parse(localStorage.getItem("teacherClassSelection") || "[]");
  Array.from(tbody.querySelectorAll('input[type="checkbox"]')).forEach(cb => {
    cb.checked = saved.includes(String(cb.value));
  });
}

function getSelectedClassIds() {
  const tbody = document.getElementById("classPrintBody");
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

async function printStudentsViaReportRenderer(studentIds) {
  const dateEl = document.getElementById("date");
  const ymd = dateEl?.value || "";
  if (!ymd) return alert("Pick a date first.");

  const printArea = document.getElementById("studentPrintArea");
  if (!printArea) return alert("Missing #studentPrintArea in student.php");

  const prevTitle = document.title;
  document.title = "";

  try {
    const pageDateEl = document.getElementById("date");   // main page date picker
const modalDateEl = document.getElementById("printDate"); // modal date picker (if present)

const pageDate = pageDateEl?.value || "";
const printDate = modalDateEl?.value || pageDate;

if (!pageDate) {
  alert("Please select a date first.");
  return;
}

const url =
  `api/reports/render-point-sheets.php?date=${encodeURIComponent(pageDate)}`
  + `&print_date=${encodeURIComponent(printDate)}`
  + `&student_ids=${encodeURIComponent(studentIds.join(","))}`
  + `&v=${Date.now()}`;

    const json = await fetchJsonText(url);
    printArea.innerHTML = json.html || "";

    window.print();
  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    document.title = prevTitle;
    setTimeout(() => { printArea.innerHTML = ""; }, 250);
  }
}

function wirePrintUIOnce() {
  if (printUiWired) return;
  printUiWired = true;

  // Open modal
  const openBtn = document.getElementById("printDailyPoints");
  if (openBtn) {
    openBtn.addEventListener("click", async () => {
      try { await loadClassTable(); } catch (e) { console.error(e); }
      openModal();
    });
  }

  // Close actions
  document.getElementById("printModalClose")?.addEventListener("click", closeModal);
  document.getElementById("printModalCancel")?.addEventListener("click", closeModal);

  document.getElementById("printModal")?.addEventListener("click", (e) => {
    if (e.target && e.target.id === "printModal") closeModal();
  });

  // Print This Student
  document.getElementById("printThisStudentBtn")?.addEventListener("click", async () => {
    const studentSel = document.getElementById("student");
    const sid = String(studentSel?.value || "");
    if (!sid) return alert("Select a student first.");
    closeModal();
    await printStudentsViaReportRenderer([sid]);
  });

  // Save Class Selection
  document.getElementById("saveClassSelectionBtn")?.addEventListener("click", () => {
    const ids = getSelectedClassIds();
    localStorage.setItem("teacherClassSelection", JSON.stringify(ids));
    showToast("Class selection saved.", 1200);
  });

  // Print Selected
  document.getElementById("printClassBtn")?.addEventListener("click", async () => {
    const ids = getSelectedClassIds();
    if (!ids.length) return alert("Select at least one student.");
    closeModal();
    await printStudentsViaReportRenderer(ids);
  });
}