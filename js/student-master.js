export async function initStudentMasterPage() {
  const tbody = document.getElementById("studentTableBody");
  const modal = document.getElementById("enrollModal");
  const closeBtn = document.querySelector(".close-btn");
  const addBtn = document.getElementById("addStudentBtn");
  const statusFilter = document.getElementById("statusFilter");

  const editModal = document.getElementById("editModal");
const editCloseBtn = document.getElementById("editCloseBtn");

const editForm = document.getElementById("editForm");
const editId = document.getElementById("editId");
const editFirst = document.getElementById("editFirst");
const editLast = document.getElementById("editLast");
const editGrade = document.getElementById("editGrade");
const editStatus = document.getElementById("editStatus");

if (editCloseBtn) editCloseBtn.onclick = () => (editModal.style.display = "none");


window.addEventListener("click", (e) => {
  if (e.target === editModal) editModal.style.display = "none";
});



  if (!tbody) return;

  // ───────────── State ─────────────
  let students = [];
  let currentSortKey = "last";
  let currentSortDir = "asc";
  let currentFilter = "Active";

  if (statusFilter) statusFilter.value = "Active";

  // ───────────── Load students from API ─────────────
  try {
    const res = await fetch("api/student/list.php", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load students");
    students = json.data || [];
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="color:red;">Failed to load students.</td>
      </tr>
    `;
    return;
  }

  // ───────────── Render table ─────────────
  function renderTable(filter = currentFilter) {
    tbody.innerHTML = "";

    const want = (filter || "all").trim();
    let filtered = want === "all"
      ? [...students]
      : students.filter(s => (s.status || "").trim() === want);

    if (currentSortKey) {
      filtered.sort((a, b) => {
        const isNumeric = k => k === "id" || k === "grade";

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
      tbody.innerHTML = `<tr><td colspan="6">No students found.</td></tr>`;
      return;
    }

    filtered.forEach(s => {
      const row = document.createElement("tr");
row.innerHTML = `
  <td>${s.id}</td>
  <td>${escapeHtml(s.last)}</td>
  <td>${escapeHtml(s.first)}</td>
  <td>${Number(s.grade ?? "")}</td>
  <td>${Number(s.statusValue) === 1 ? "Active" : "Inactive"}</td>
  <td>
    <button class="btn-edit"
      data-id="${s.id}"
      data-first="${escapeHtml(s.first)}"
      data-last="${escapeHtml(s.last)}"
      data-grade="${Number(s.grade ?? "")}"
      data-status-value="${Number(s.status)}">
      Edit
    </button>
  </td>
`;


      tbody.appendChild(row);
    });
  }

  tbody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-edit");
  if (!btn) return;

  const id = Number(btn.getAttribute("data-id"));
  const s = students.find(x => Number(x.id) === id);
  if (!s) return;

  editId.value = String(s.id);
  editFirst.value = s.first ?? "";
  editLast.value = s.last ?? "";
  editGrade.value = String(s.grade ?? "");
  const sv = (s.statusValue ?? s.status);
editStatus.value = String(Number(sv) === 1 ? 1 : 0);



  editModal.style.display = "flex";
});


  // ───────────── Sorting ─────────────
  document.querySelectorAll("th.sortable").forEach(th => {
    th.onclick = () => {
      const key = th.getAttribute("data-key");
      if (!key) return;

      if (currentSortKey === key) {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        currentSortDir = "asc";
      }

      document.querySelectorAll("th.sortable")
        .forEach(h => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);

      renderTable();
    };
  });

  // ───────────── Filter dropdown ─────────────
  if (statusFilter) {
    statusFilter.onchange = () => {
      currentFilter = statusFilter.value;
      renderTable();
    };
  }

  // ───────────── Modal open / close ─────────────
  if (addBtn) addBtn.onclick = () => (modal.style.display = "flex");
  if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");

  window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  // ───────────── Enroll form submit ─────────────
  const form = document.getElementById("enrollForm");
  const firstInput = document.getElementById("firstInput");
  const lastInput  = document.getElementById("lastInput");
  const gradeInput = document.getElementById("gradeInput");

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const first = firstInput?.value.trim() || "";
      const last  = lastInput?.value.trim() || "";
      const grade = Number(gradeInput?.value || 0);

      const body = new URLSearchParams();
      body.set("first", first);
      body.set("last", last);
      body.set("grade", String(grade));

      try {
        const res = await fetch("api/student/create.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          cache: "no-store"
        });

        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Enroll failed.");

        students.push(json.data);

        // Ensure new student is visible
        currentFilter = "Active";
        if (statusFilter) statusFilter.value = "Active";

        modal.style.display = "none";
        form.reset();
        renderTable();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    };
  }

  // Initial render
  renderTable("Active");


// ───────────── Helpers ─────────────
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

if (editForm) {
  editForm.onsubmit = async (e) => {
    e.preventDefault();

    const body = new URLSearchParams();
    body.set("id", editId.value);
    body.set("first", editFirst.value.trim());
    body.set("last", editLast.value.trim());
    body.set("grade", String(Number(editGrade.value || 0)));
    body.set("status", editStatus.value);

    try {
      const res = await fetch("api/student/update.php?v=" + Date.now(), {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
  cache: "no-store"
});


      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed.");

      // Update local array
      const idx = students.findIndex(x => Number(x.id) === Number(editId.value));
      if (idx >= 0) {
        students[idx] = json.data; // assume API returns updated student row
      }

      editModal.style.display = "none";
      renderTable();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };
}
}

