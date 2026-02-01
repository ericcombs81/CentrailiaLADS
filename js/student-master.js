console.log("StudentMaster JS LOADED - " + new Date().toISOString());
alert("StudentMaster JS LOADED");

export function initStudentMasterPage() {
  const tbody = document.getElementById("studentTableBody");
  const modal = document.getElementById("enrollModal");
  const closeBtn = document.querySelector(".close-btn");
  const addBtn = document.getElementById("addStudentBtn");
  const statusFilter = document.getElementById("statusFilter");

  if (!tbody) return;

  // --- Generate dummy students ---
  const students = [];
  const firstNames = ["John", "Jane", "Alex", "Maria", "Chris", "Emma", "Ethanial", "Sophia", "Jacob", "Ava"];
  const lastNames = ["Smith", "Johnson", "Brown", "Williams", "Davis", "Garcia", "Miller", "Wilson", "Moore", "Taylor"];

  for (let i = 1; i <= 30; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const status = i % 3 === 0 ? "Inactive" : "Active";

    students.push({ id: i, last, first, status });
  }

  // ✅ Default state: show only Active students, sorted by Last Name (A–Z)
  let currentSortKey = "last";
  let currentSortDir = "asc";
  let currentFilter = "Active";

  // Make sure the dropdown visually shows "Active"
  if (statusFilter) {
    statusFilter.value = "Active";
  }

  // ───────────── Render Table ─────────────
  function renderTable(filter = currentFilter) {
    tbody.innerHTML = "";

    // Apply filter
    const want = (filter || "all").trim();
    let filtered = want === "all"
      ? [...students]
      : students.filter(s => (s.status || "").trim() === want);

    // Apply sorting
    if (currentSortKey) {
      filtered.sort((a, b) => {
        const valA = String(a[currentSortKey]).toLowerCase();
        const valB = String(b[currentSortKey]).toLowerCase();
        if (valA < valB) return currentSortDir === "asc" ? -1 : 1;
        if (valA > valB) return currentSortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    // Build rows
    filtered.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.id}</td>
        <td>${s.last}</td>
        <td>${s.first}</td>
        <td>${s.status}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // ───────────── Sorting (Header Clicks) ─────────────
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      if (currentSortKey === key) {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        currentSortDir = "asc";
      }

      // Update arrows
      document.querySelectorAll("th.sortable").forEach(h => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);

      renderTable();
    });
  });

  // ───────────── Filter (Dropdown) ─────────────
  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      currentFilter = statusFilter.value;
      renderTable();
    });
  }

  // ───────────── Modal Open/Close ─────────────
  if (addBtn) addBtn.addEventListener("click", () => (modal.style.display = "flex"));
  if (closeBtn) closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  // ✅ Initial render — Active students, sorted by Last Name
  renderTable("Active");
}
