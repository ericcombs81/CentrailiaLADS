import { secureFetch } from './security.js';
export function initBehaviorPage() {
  const tbody = document.getElementById("behaviorTableBody");
  if (!tbody) return;

  // Add modal elements
  const addBtn = document.getElementById("addBehaviorBtn");
  const addModal = document.getElementById("addBehaviorModal");
  const addClose = document.getElementById("addBehaviorCloseBtn");
  const addForm = document.getElementById("addBehaviorForm");
  const addBehaviorText = document.getElementById("addBehaviorText");
  const addIsDefault = document.getElementById("addIsDefault");

  // Edit modal elements
  const editModal = document.getElementById("editBehaviorModal");
  const editClose = document.getElementById("editBehaviorCloseBtn");
  const editForm = document.getElementById("editBehaviorForm");
  const editId = document.getElementById("editBehaviorId");
  const editBehaviorText = document.getElementById("editBehaviorText");
  const editIsDefault = document.getElementById("editIsDefault");
  const assignedModal = document.getElementById("assignedBehaviorModal");
  const assignedClose = document.getElementById("assignedBehaviorCloseBtn");
  const assignedTitle = document.getElementById("assignedBehaviorTitle");
  const assignedList = document.getElementById("assignedBehaviorList");

  let behaviors = [];
  let currentSortKey = "behavior_text";
  let currentSortDir = "asc";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  async function loadBehaviors() {
    const res = await secureFetch("api/behaviors/list.php", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load behaviors.");
    behaviors = json.data || [];
  }

  function sortRows(rows) {
    // Default sort (your request): defaults on top, then alphabetical
    // If user clicks header, we still keep defaults-on-top behavior by default,
    // but allow toggling alphabetical asc/desc inside each group.
    const dir = currentSortDir === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      const da = Number(a.is_default) === 1 ? 0 : 1;
      const db = Number(b.is_default) === 1 ? 0 : 1;
      if (da !== db) return da - db; // defaults first

      const sa = String(a.behavior_text ?? "").toLowerCase();
      const sb = String(b.behavior_text ?? "").toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return  1 * dir;
      return 0;
    });
  }

  function render() {
    tbody.innerHTML = "";

    let rows = sortRows([...behaviors]);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No behaviors found.</td></tr>`;
      return;
    }

    for (const b of rows) {
      const tr = document.createElement("tr");
      const defaultText = Number(b.is_default) === 1 ? "Yes" : "No";
      const assignedCount = Number(b.current_assignment_count || 0);
      const assignedText = assignedCount === 0 ? "Unused" : `Assigned to ${assignedCount}`;
      const assignedButton = assignedCount === 0
        ? `<span class="status-unused">Unused</span>`
        : `<button class="btn-assigned" data-id="${b.behavior_id}">${escapeHtml(assignedText)}</button>`;
      const deleteControl = assignedCount === 0
        ? `<button class="btn-delete" data-id="${b.behavior_id}">Delete</button>`
        : `<button class="btn-delete" disabled title="Unassign this behavior from students before deleting.">Delete</button>`;

tr.innerHTML = `
  <td>${escapeHtml(b.behavior_text)}</td>
  <td class="center">${defaultText}</td>
  <td class="center">${assignedButton}</td>
  <td class="center">
    <button class="btn-edit" data-id="${b.behavior_id}">Edit</button>
    ${deleteControl}
  </td>
`;

      tbody.appendChild(tr);
    }
  }

  // Sorting click (single sortable column)
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      if (currentSortKey === "behavior_text") {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = "behavior_text";
        currentSortDir = "asc";
      }

      document.querySelectorAll("th.sortable").forEach(h => h.classList.remove("asc", "desc"));
      th.classList.add(currentSortDir);
      render();
    });
  });

  // Open/close modals
  addBtn?.addEventListener("click", () => {
    addForm.reset();
    addModal.style.display = "flex";
    addBehaviorText.focus();
  });

  addClose?.addEventListener("click", () => (addModal.style.display = "none"));
  editClose?.addEventListener("click", () => (editModal.style.display = "none"));
  assignedClose?.addEventListener("click", () => (assignedModal.style.display = "none"));

  window.addEventListener("click", (e) => {
    if (e.target === addModal) addModal.style.display = "none";
    if (e.target === editModal) editModal.style.display = "none";
    if (e.target === assignedModal) assignedModal.style.display = "none";
  });

  function showAssignedStudents(b) {
    if (!assignedModal || !assignedTitle || !assignedList) return;

    const names = Array.isArray(b.assigned_students) ? b.assigned_students : [];
    assignedTitle.textContent = `Assigned Students: ${b.behavior_text}`;
    assignedList.innerHTML = "";

    if (names.length === 0) {
      assignedList.innerHTML = `<p>No current assignments.</p>`;
    } else {
      const ul = document.createElement("ul");
      names.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      });
      assignedList.appendChild(ul);
    }

    assignedModal.style.display = "flex";
  }

  async function archiveBehavior(b) {
    const msg = `Delete "${b.behavior_text}"?\n\nThis will archive it so it no longer appears in active behavior lists. Past reports will still show it.`;
    if (!confirm(msg)) return;

    const body = new URLSearchParams();
    body.set("behavior_id", b.behavior_id);

    const res = await secureFetch("api/behaviors/delete.php?v=" + Date.now(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store"
    });

    const json = await res.json();
    if (!json.ok) {
      if (Array.isArray(json.assigned_students) && json.assigned_students.length > 0) {
        b.assigned_students = json.assigned_students.map(s => s.label || `${s.last}, ${s.first}`);
        b.current_assignment_count = b.assigned_students.length;
        showAssignedStudents(b);
      }
      throw new Error(json.error || "Delete failed.");
    }

    behaviors = behaviors.filter(x => Number(x.behavior_id) !== Number(b.behavior_id));
    render();
  }

  // Row actions (delegate)
  tbody.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const assignedBtn = e.target.closest(".btn-assigned");
    const deleteBtn = e.target.closest(".btn-delete:not(:disabled)");
    const btn = editBtn || assignedBtn || deleteBtn;
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const b = behaviors.find(x => Number(x.behavior_id) === id);
    if (!b) return;

    if (assignedBtn) {
      showAssignedStudents(b);
      return;
    }

    if (deleteBtn) {
      archiveBehavior(b).catch(err => {
        console.error(err);
        alert(err.message);
      });
      return;
    }

    editId.value = String(b.behavior_id);
    editBehaviorText.value = b.behavior_text ?? "";
    editIsDefault.value = String(Number(b.is_default) === 1 ? 1 : 0);

    editModal.style.display = "flex";
    editBehaviorText.focus();
  });

  // Add submit
  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = addForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const body = new URLSearchParams();
      body.set("behavior_text", addBehaviorText.value.trim());
      body.set("is_default", addIsDefault.value);

      const res = await secureFetch("api/behaviors/create.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store"
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Create failed.");

      await loadBehaviors();
      addModal.style.display = "none";
      render();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Edit submit
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = editForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const body = new URLSearchParams();
      body.set("behavior_id", editId.value);
      body.set("behavior_text", editBehaviorText.value.trim());
      body.set("is_default", editIsDefault.value);

      const res = await secureFetch("api/behaviors/update.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store"
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed.");

      await loadBehaviors();

      editModal.style.display = "none";
      render();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Init
  (async () => {
    try {
      await loadBehaviors();
      const th = document.querySelector('th.sortable[data-key="behavior_text"]');
      if (th) th.classList.add("asc");
      render();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Failed to load behaviors.</td></tr>`;
    }
  })();
}
