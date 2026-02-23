export function initMassCommentPage() {
  const dateEl = document.getElementById("mcDate");
  const textEl = document.getElementById("mcText");
  const saveBtn = document.getElementById("mcSaveBtn");
  const tbody = document.getElementById("mcTableBody");
  const toast = document.getElementById("mcToast");

  // Edit modal
  const editModal = document.getElementById("mcEditModal");
  const editClose = document.getElementById("mcEditClose");
  const editCancel = document.getElementById("mcEditCancel");
  const editSave = document.getElementById("mcEditSave");
  const editId = document.getElementById("mcEditId");
  const editDate = document.getElementById("mcEditDate");
  const editText = document.getElementById("mcEditText");

  // default date today (Central)
  const now = new Date();
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  dateEl.value = toYMD(central);

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.opacity = "1";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toast.style.opacity = "0"), 1800);
  }

  async function fetchJson(url, opts) {
    const res = await fetch(url, { cache: "no-store", ...(opts || {}) });
    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); }
    catch { throw new Error("Server did not return JSON: " + raw.slice(0, 160)); }
    if (!json.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function loadTable() {
    tbody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;
    const json = await fetchJson(`api/mass-comment/list.php?v=${Date.now()}`);
    const rows = json.data || [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4">No mass comments yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.comment_text)}</td>
        <td class="center">${escapeHtml(r.comment_date)}</td>
        <td class="center"><button class="btn-edit" data-id="${r.id}">Edit</button></td>
        <td class="center"><button class="btn-delete" data-id="${r.id}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    }
  }

  saveBtn?.addEventListener("click", async () => {
    const d = dateEl.value;
    const t = (textEl.value || "").trim();
    if (!d) return alert("Pick a date.");
    if (!t) return alert("Type a comment.");

    saveBtn.disabled = true;
    try {
      await fetchJson(`api/mass-comment/create.php?v=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_date: d, comment_text: t })
      });

      textEl.value = "";
      showToast("Saved + applied to all students.");
      await loadTable();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      saveBtn.disabled = false;
    }
  });

  // delegate edit/delete
  tbody?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const delBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      const json = await fetchJson(`api/mass-comment/list.php?id=${id}&v=${Date.now()}`);
      const row = (json.data && json.data[0]) ? json.data[0] : null;
      if (!row) return;

      editId.value = row.id;
      editDate.value = row.comment_date;
      editText.value = row.comment_text;

      editModal.style.display = "flex";
      return;
    }

    if (delBtn) {
      const id = Number(delBtn.dataset.id);
      if (!confirm("Delete this mass comment and remove it from all students for that date?")) return;

      try {
        await fetchJson(`api/mass-comment/delete.php?v=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        showToast("Deleted + removed.");
        await loadTable();
      } catch (e2) {
        console.error(e2);
        alert(e2.message);
      }
    }
  });

  // modal close
  function closeModal() { editModal.style.display = "none"; }
  editClose?.addEventListener("click", closeModal);
  editCancel?.addEventListener("click", closeModal);
  window.addEventListener("click", (e) => { if (e.target === editModal) closeModal(); });

  editSave?.addEventListener("click", async () => {
    const id = Number(editId.value || 0);
    const t = (editText.value || "").trim();
    if (!id) return;
    if (!t) return alert("Comment cannot be blank.");

    editSave.disabled = true;
    try {
      await fetchJson(`api/mass-comment/update.php?v=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, comment_text: t })
      });
      showToast("Updated + re-applied.");
      closeModal();
      await loadTable();
    } catch (e3) {
      console.error(e3);
      alert(e3.message);
    } finally {
      editSave.disabled = false;
    }
  });

  loadTable().catch(console.error);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function toYMD(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
}