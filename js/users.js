export function initUsersPage() {
  const tbody = document.getElementById("usersTableBody");
  if (!tbody) return;

  // Add modal
  const addBtn = document.getElementById("addUserBtn");
  const addModal = document.getElementById("addUserModal");
  const addClose = document.getElementById("addUserCloseBtn");
  const addForm = document.getElementById("addUserForm");
  const addFirst = document.getElementById("addFirst");
  const addLast = document.getElementById("addLast");
  const addEmail = document.getElementById("addEmail");
  const addRole = document.getElementById("addRole");
  const tempPassBox = document.getElementById("tempPassBox");

  // Edit modal
  const editModal = document.getElementById("editUserModal");
  const editClose = document.getElementById("editUserCloseBtn");
  const editForm = document.getElementById("editUserForm");
  const editId = document.getElementById("editId");
  const editFirst = document.getElementById("editFirst");
  const editLast = document.getElementById("editLast");
  const editEmail = document.getElementById("editEmail");
  const editRole = document.getElementById("editRole");

  let users = [];
  // ✅ Default sort now that ID column is removed
  let currentSortKey = "last";
  let currentSortDir = "asc";

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function sortRows(rows) {
    const dir = currentSortDir === "asc" ? 1 : -1;

    return rows.sort((a, b) => {
      const va = a[currentSortKey];
      const vb = b[currentSortKey];

      // keep this just in case, even though we don't sort by id via UI anymore
      if (currentSortKey === "id") return (Number(va) - Number(vb)) * dir;

      const sa = String(va ?? "").toLowerCase();
      const sb = String(vb ?? "").toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });
  }

  async function loadUsers() {
    const res = await fetch("api/users/list.php", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to load users.");
    users = json.data || [];
  }

  function render() {
    tbody.innerHTML = "";

    let rows = sortRows([...users]);
    if (rows.length === 0) {
      // ✅ colspan updated (6 columns now)
      tbody.innerHTML = `<tr><td colspan="6">No users found.</td></tr>`;
      return;
    }

    for (const u of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <!-- ✅ ID td removed -->
        <td>${escapeHtml(u.first)}</td>
        <td>${escapeHtml(u.last)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.role)}</td>
        <td class="center">
          <button class="btn-edit btn-edit-user" data-id="${u.id}">Edit</button>
        </td>
        <td class="center">
          <button class="btn-delete btn-delete-user" data-id="${u.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  // Sort header clicks
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
      render();
    });
  });

  // Open/close modals
  addBtn?.addEventListener("click", () => {
    tempPassBox.style.display = "none";
    tempPassBox.textContent = "";
    addForm?.reset();
    addModal.style.display = "flex";
  });

  addClose?.addEventListener("click", () => (addModal.style.display = "none"));
  editClose?.addEventListener("click", () => (editModal.style.display = "none"));

  window.addEventListener("click", (e) => {
    if (e.target === addModal) addModal.style.display = "none";
    if (e.target === editModal) editModal.style.display = "none";
  });

  // Delegate edit/delete clicks
  tbody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit-user");
    const delBtn = e.target.closest(".btn-delete-user");

    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      const u = users.find(x => Number(x.id) === id);
      if (!u) return;

      editId.value = String(u.id);
      editFirst.value = u.first ?? "";
      editLast.value = u.last ?? "";
      editEmail.value = u.email ?? "";
      editRole.value = u.role ?? "Teacher";

      editModal.style.display = "flex";
      return;
    }

    if (delBtn) {
      const id = Number(delBtn.dataset.id);
      const u = users.find(x => Number(x.id) === id);
      if (!u) return;

      if (!confirm(`Delete user ${u.first} ${u.last} (${u.email})? This cannot be undone.`)) return;

      try {
        const body = new URLSearchParams();
        body.set("id", String(id));

        const res = await fetch("api/users/delete.php?v=" + Date.now(), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          cache: "no-store"
        });

        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Delete failed.");

        users = users.filter(x => Number(x.id) !== id);
        render();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    }
  });

  // Add user submit
  addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = new URLSearchParams();
      body.set("first", addFirst.value.trim());
      body.set("last", addLast.value.trim());
      body.set("email", addEmail.value.trim());
      body.set("role", addRole.value);

      const res = await fetch("api/users/create.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store"
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Create failed.");

      // Show temp password once
      if (json.tempPassword) {
        tempPassBox.textContent = `Temporary Password: ${json.tempPassword} (copy this now)`;
        tempPassBox.style.display = "block";
      }

      users.push(json.data);
      render();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // Edit user submit
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const body = new URLSearchParams();
      body.set("id", editId.value);
      body.set("first", editFirst.value.trim());
      body.set("last", editLast.value.trim());
      body.set("email", editEmail.value.trim());
      body.set("role", editRole.value);

      const res = await fetch("api/users/update.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store"
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed.");

      const idx = users.findIndex(x => Number(x.id) === Number(json.data.id));
      if (idx >= 0) users[idx] = json.data;

      editModal.style.display = "none";
      render();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // Init
  (async () => {
    try {
      await loadUsers();

      // ✅ default sort indicator moved to "last"
      const defaultTh = document.querySelector('th.sortable[data-key="last"]');
      if (defaultTh) defaultTh.classList.add("asc");

      render();
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Failed to load users.</td></tr>`;
    }
  })();
}
