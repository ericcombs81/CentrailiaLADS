export async function initStudentMasterPage() {
  const tbody = document.getElementById("studentTableBody");
  const modal = document.getElementById("enrollModal");
  const closeBtn = document.querySelector(".close-btn");
  const addBtn = document.getElementById("addStudentBtn");
  const statusFilter = document.getElementById("statusFilter");

  const gradePlusBtn = document.getElementById("gradePlusBtn");
  const gradeMinusBtn = document.getElementById("gradeMinusBtn");

  const editModal = document.getElementById("editModal");
  const editCloseBtn = document.getElementById("editCloseBtn");

  const editForm = document.getElementById("editForm");
  const editId = document.getElementById("editId");
  const editFirst = document.getElementById("editFirst");
  const editLast = document.getElementById("editLast");
  const editGrade = document.getElementById("editGrade");
  const editStatus = document.getElementById("editStatus");

  if (!tbody) return;

  // Close edit modal
  editCloseBtn?.addEventListener("click", () => {
    editModal.style.display = "none";
  });

  // Click outside modals closes them
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === editModal) editModal.style.display = "none";
  });

  // ───────────── State ─────────────
  let students = [];
  let currentSortKey = "last";
  let currentSortDir = "asc";
  let currentFilter = "Active";

  if (statusFilter) statusFilter.value = "Active";

  // ───────────── Helpers ─────────────
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m])
    );
  }

  // Display clamp only (DB grade can be any integer)
  function formatGrade(s) {
    const g = Number(s?.grade ?? 0);
    if (g > 12) return "12+";
    if (g < 1) return "1";
    return String(g || "");
  }

  async function loadStudents() {
    const res = await fetch("api/student/list.php?v=" + Date.now(), { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load students");
    students = json.data || [];
  }

  // ───────────── Render table ─────────────
  function renderTable(filter = currentFilter) {
    tbody.innerHTML = "";

    const want = (filter || "all").trim();
    let filtered =
      want === "all" ? [...students] : students.filter((s) => (s.status || "").trim() === want);

    if (currentSortKey) {
      filtered.sort((a, b) => {
        const isNumeric = (k) => k === "grade";

        if (isNumeric(currentSortKey)) {
          const na = Number(a[currentSortKey] ?? 0);
          const nb = Number(b[currentSortKey] ?? 0);
          return currentSortDir === "asc" ? na - nb : nb - na;
        }

        const va = String(a[currentSortKey] ?? "").toLowerCase();
        const vb = String(b[currentSortKey] ?? "").toLowerCase();
        if (va < vb) return currentSortDir === "asc" ? -1 : 1;
        if (va > vb) return currentSortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`;
      return;
    }

    filtered.forEach((s) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(s.last)}</td>
        <td>${escapeHtml(s.first)}</td>
        <td>${formatGrade(s)}</td>
        <td>${Number(s.statusValue) === 1 ? "Active" : "Inactive"}</td>
        <td>
          <button class="btn-edit" data-id="${s.id}">Edit</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // ───────────── Bulk grade shift ─────────────
  async function shiftAllGrades(delta) {
    const label = delta > 0 ? "Grade +" : "Grade -";
    if (!confirm(`${label} will update EVERY student in the database. Continue?`)) return;

    try {
      const body = new URLSearchParams();
      body.set("delta", String(delta));

      const res = await fetch("api/student/grade-shift.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Grade shift failed.");

      await loadStudents();
      renderTable();
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  }

  gradePlusBtn?.addEventListener("click", () => shiftAllGrades(1));
  gradeMinusBtn?.addEventListener("click", () => shiftAllGrades(-1));

  // ───────────── Sorting ─────────────
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      if (!key) return;

      if (currentSortKey === key) {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        currentSortDir = "asc";
      }

      document.querySelectorAll("th.sortable").forEach((h) => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);

      renderTable();
    });
  });

  // ───────────── Filter ─────────────
  statusFilter?.addEventListener("change", () => {
    currentFilter = statusFilter.value;
    renderTable();
  });

  // ───────────── Enroll modal ─────────────
  addBtn?.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  closeBtn?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // ───────────── Enroll form submit ─────────────
  const form = document.getElementById("enrollForm");
  const firstInput = document.getElementById("firstInput");
  const lastInput = document.getElementById("lastInput");
  const gradeInput = document.getElementById("gradeInput");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const first = firstInput?.value.trim() || "";
    const last = lastInput?.value.trim() || "";
    const grade = Number(gradeInput?.value || 1);

    const body = new URLSearchParams();
    body.set("first", first);
    body.set("last", last);
    body.set("grade", String(grade));

    try {
      const res = await fetch("api/student/create.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Enroll failed.");

      await loadStudents();
      currentFilter = "Active";
      if (statusFilter) statusFilter.value = "Active";

      modal.style.display = "none";
      form.reset();
      renderTable();
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  });

  // ───────────── Edit modal open ─────────────
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-edit");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-id"));
    const s = students.find((x) => Number(x.id) === id);
    if (!s) return;

    editId.value = String(s.id);
    editFirst.value = s.first ?? "";
    editLast.value = s.last ?? "";
    editGrade.value = String(s.grade ?? "");
    const sv = s.statusValue ?? s.status;
    editStatus.value = String(Number(sv) === 1 ? 1 : 0);

    editModal.style.display = "flex";
  });

  // ───────────── Edit form submit ─────────────
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = new URLSearchParams();
    body.set("id", editId.value);
    body.set("first", editFirst.value.trim());
    body.set("last", editLast.value.trim());
    body.set("grade", String(Number(editGrade.value || 1)));
    body.set("status", editStatus.value);

    try {
      const res = await fetch("api/student/update.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed.");

      await loadStudents();
      editModal.style.display = "none";
      renderTable();
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  });

  // ───────────── Initial load ─────────────
  try {
    await loadStudents();
    renderTable("Active");
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Failed to load students.</td></tr>`;
  }
}