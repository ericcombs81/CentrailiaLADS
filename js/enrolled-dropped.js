export function initEnrolledDroppedPage() {
  const tbody = document.getElementById("enrolledTableBody");
  const dropBtn = document.getElementById("dropAllBtn");
  if (!tbody) return;

  let students = [];
  let currentSortKey = "last";
  let currentSortDir = "asc";

  const isNumericKey = (k) => k === "grade";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  async function loadStudents() {
    const res = await fetch("api/student/list.php", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load students");
    students = json.data || [];
  }

  function getActiveStudents() {
    // list.php provides statusValue (0/1) + status ("Active"/"Inactive")
    return students.filter(s => Number(s.statusValue) === 1 || String(s.status).trim() === "Active");
  }

  function sortRows(rows) {
    const dir = currentSortDir === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      const va = a[currentSortKey];
      const vb = b[currentSortKey];

      if (isNumericKey(currentSortKey)) {
        return (Number(va || 0) - Number(vb || 0)) * dir;
      }

      const sa = String(va || "").toLowerCase();
      const sb = String(vb || "").toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });
  }

  function renderTable() {
    tbody.innerHTML = "";

    let rows = getActiveStudents();
    rows = sortRows(rows);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No active students found.</td></tr>`;
      return;
    }

    rows.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeHtml(s.last)}</td>
        <td>${escapeHtml(s.first)}</td>
        <td class="center">${Number(s.grade ?? "")}</td>
        <td class="center">
          <input type="checkbox" class="pending-drop" data-id="${s.id}">
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  // Sorting
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      if (!key) return;

      if (currentSortKey === key) {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        currentSortDir = "asc";
      }

      document.querySelectorAll("th.sortable").forEach(h => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);

      renderTable();
    });
  });

  // Drop Selected
  if (dropBtn) {
    dropBtn.addEventListener("click", async () => {
      const checked = Array.from(document.querySelectorAll(".pending-drop:checked"));
      if (checked.length === 0) {
        alert("No students selected.");
        return;
      }

      if (!confirm(`Drop ${checked.length} student(s)?`)) return;

      try {
        dropBtn.disabled = true;

        // build a quick lookup so we can send required fields to update.php
        const byId = new Map(students.map(s => [Number(s.id), s]));

        for (const cb of checked) {
          const id = Number(cb.getAttribute("data-id"));
          const s = byId.get(id);
          if (!s) continue;

          const body = new URLSearchParams();
          body.set("id", String(s.id));
          body.set("first", String(s.first || ""));
          body.set("last", String(s.last || ""));
          body.set("grade", String(Number(s.grade || 0)));
          body.set("status", "0");

          const res = await fetch("api/student/update.php?v=" + Date.now(), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
            cache: "no-store"
          });

          const json = await res.json();
          if (!json.ok) throw new Error(json.error || "Update failed.");

          // update local array with returned row
          const idx = students.findIndex(x => Number(x.id) === Number(s.id));
          if (idx >= 0) students[idx] = json.data;
        }

        renderTable();
        alert("Selected students dropped.");
      } catch (err) {
        console.error(err);
        alert(err.message);
      } finally {
        dropBtn.disabled = false;
      }
    });
  }

  // init
  (async () => {
    try {
      await loadStudents();
      // default sort UI state
      const defaultTh = document.querySelector('th.sortable[data-key="last"]');
      if (defaultTh) defaultTh.classList.add("asc");
      renderTable();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Failed to load students.</td></tr>`;
    }
  })();
}
