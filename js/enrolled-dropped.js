export function initEnrolledDroppedPage() {
  const tbody = document.getElementById("enrolledTableBody");
  const dropDate = document.getElementById("dropDate");

  if (!tbody) return;

  // Default to today's date in Central Time
  const now = new Date();
  const central = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  dropDate.value = central.toISOString().split('T')[0];

  // Dummy data (all active)
  const students = [];
  const firstNames = ["John", "Jane", "Alex", "Maria", "Chris", "Emma", "Ethan", "Sophia", "Jacob", "Ava"];
  const lastNames = ["Smith", "Johnson", "Brown", "Williams", "Davis", "Garcia", "Miller", "Wilson", "Moore", "Taylor"];
  const districts = ["Centralia", "Salem", "Mt. Vernon", "Nashville", "Fairfield"];
  const grades = ["9", "10", "11", "12"];
  const eligibility = ["Yes", "No"];

  for (let i = 1; i <= 25; i++) {
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const elig = eligibility[Math.floor(Math.random() * eligibility.length)];
    const enrollDate = new Date(central.getTime() - Math.random() * 200 * 86400000)
      .toISOString().split("T")[0];

    students.push({ id: i, last, first, district, grade, elig, enrollDate });
  }

  let currentSortKey = null;
  let currentSortDir = 'asc';

  function renderTable() {
    tbody.innerHTML = "";

    let sorted = [...students];
    if (currentSortKey) {
      sorted.sort((a, b) => {
        const valA = a[currentSortKey].toLowerCase();
        const valB = b[currentSortKey].toLowerCase();
        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    sorted.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.id}</td>
        <td>${s.last}</td>
        <td>${s.first}</td>
        <td>${s.district}</td>
        <td>${s.grade}</td>
        <td>${s.elig}</td>
        <td>${s.enrollDate}</td>
        <td><input type="checkbox"></td>
      `;
      tbody.appendChild(row);
    });
  }

  // Sortable headers
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      if (currentSortKey === key) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortKey = key;
        currentSortDir = 'asc';
      }

      document.querySelectorAll("th.sortable").forEach(h => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);
      renderTable();
    });
  });

  renderTable();
}
