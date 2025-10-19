export function initStudentMasterPage() {
  const tbody = document.getElementById("studentTableBody");
  const modal = document.getElementById("enrollModal");
  const closeBtn = document.querySelector(".close-btn");
  const addBtn = document.getElementById("addStudentBtn");
  const statusFilter = document.getElementById("statusFilter");

  if (!tbody) return;

  // --- Generate dummy students ---
  const students = [];
  const firstNames = ["John", "Jane", "Alex", "Maria", "Chris", "Emma", "Ethan", "Sophia", "Jacob", "Ava"];
  const lastNames = ["Smith", "Johnson", "Brown", "Williams", "Davis", "Garcia", "Miller", "Wilson", "Moore", "Taylor"];
  const cities = ["Centralia", "Salem", "Mount Vernon", "Fairfield", "Nashville", "Du Quoin"];
  const states = ["IL", "MO", "IN"];

  for (let i = 1; i <= 30; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const zip = (60000 + Math.floor(Math.random() * 9999)).toString();
    const phone = `618-555-${1000 + i}`;
    const address = `${Math.floor(Math.random() * 999)} Main St`;
    const status = i % 3 === 0 ? "Inactive" : "Active";

    students.push({ id: i, last, first, address, city, state, zip, phone, status });
  }

  let currentSortKey = null;
  let currentSortDir = 'asc';
  let currentFilter = 'all';

  function renderTable() {
    tbody.innerHTML = "";

    let filtered = students.filter(s =>
      currentFilter === 'all' ? true : s.status === currentFilter
    );

    if (currentSortKey) {
      filtered.sort((a, b) => {
        const valA = a[currentSortKey].toLowerCase();
        const valB = b[currentSortKey].toLowerCase();
        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    filtered.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.id}</td>
        <td>${s.last}</td>
        <td>${s.first}</td>
        <td>${s.address}</td>
        <td>${s.city}</td>
        <td>${s.state}</td>
        <td>${s.zip}</td>
        <td>${s.phone}</td>
        <td>${s.status}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Handle sort clicks
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      if (currentSortKey === key) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortKey = key;
        currentSortDir = 'asc';
      }

      // Update arrows
      document.querySelectorAll("th.sortable").forEach(h => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);

      renderTable();
    });
  });

  // Handle filter changes
  statusFilter.addEventListener("change", () => {
    currentFilter = statusFilter.value;
    renderTable();
  });

  // Modal open/close
  if (addBtn) addBtn.addEventListener("click", () => modal.style.display = "flex");
  if (closeBtn) closeBtn.addEventListener("click", () => modal.style.display = "none");
  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Initial render
  renderTable();
}
