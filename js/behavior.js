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

  let behaviors = [];
  let currentSortKey = "behavior_text";
  let currentSortDir = "asc";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  async function loadBehaviors() {
    const res = await fetch("api/behaviors/list.php", { cache: "no-store" });
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
      tbody.innerHTML = `<tr><td colspan="2">No behaviors found.</td></tr>`;
      return;
    }

    for (const b of rows) {
      const tr = document.createElement("tr");
      const label = Number(b.is_default) === 1 ? `${b.behavior_text} (Default)` : b.behavior_text;

      const defaultText = Number(b.is_default) === 1 ? "Yes" : "No";

tr.innerHTML = `
  <td>${escapeHtml(b.behavior_text)}</td>
  <td class="center">${defaultText}</td>
  <td class="center">
    <button class="btn-edit" data-id="${b.behavior_id}">Edit</button>
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

  window.addEventListener("click", (e) => {
    if (e.target === addModal) addModal.style.display = "none";
    if (e.target === editModal) editModal.style.display = "none";
  });

  // Edit click (delegate)
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-edit");
    if (!btn) return;

    const id = Number(btn.dataset.id);
    const b = behaviors.find(x => Number(x.behavior_id) === id);
    if (!b) return;

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

      const res = await fetch("api/behaviors/create.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store"
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Create failed.");

      behaviors.push(json.data);
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

      const res = await fetch("api/behaviors/update.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store"
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed.");

      const idx = behaviors.findIndex(x => Number(x.behavior_id) === Number(json.data.behavior_id));
      if (idx >= 0) behaviors[idx] = json.data;

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
      tbody.innerHTML = `<tr><td colspan="2" style="color:red;">Failed to load behaviors.</td></tr>`;
    }
  })();
}
