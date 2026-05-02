import { secureFetch } from './security.js';

export function initMassCommentPage() {
  const startEl = document.getElementById("mcStartDate");
  const endEl = document.getElementById("mcEndDate");
  const textEl = document.getElementById("mcText");
  const saveBtn = document.getElementById("mcSaveBtn");
  const tbody = document.getElementById("mcTableBody");
  const toast = document.getElementById("mcToast");

  const editModal = document.getElementById("mcEditModal");
  const editClose = document.getElementById("mcEditClose");
  const editCancel = document.getElementById("mcEditCancel");
  const editSave = document.getElementById("mcEditSave");
  const editId = document.getElementById("mcEditId");
  const editStartDate = document.getElementById("mcEditStartDate");
  const editEndDate = document.getElementById("mcEditEndDate");
  const editText = document.getElementById("mcEditText");

  const now = new Date();
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const today = toYMD(central);
  if (startEl) startEl.value = today;
  if (endEl) endEl.value = today;

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.opacity = "1";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (toast.style.opacity = "0"), 2200);
  }

  async function fetchJson(url, opts) {
    const res = await secureFetch(url, { cache: "no-store", ...(opts || {}) });
    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); }
    catch { throw new Error("Server did not return JSON: " + raw.slice(0, 180)); }
    if (!json.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  function validateRange(startDate, endDate) {
    if (!startDate) throw new Error("Pick a start date.");
    if (!endDate) throw new Error("Pick an end date.");
    if (endDate < startDate) throw new Error("End date must be on or after start date.");
  }

  async function loadTable() {
    tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
    const json = await fetchJson(`api/mass-comment/list.php?v=${Date.now()}`);
    const rows = json.data || [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6">No mass comments yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    for (const r of rows) {
      const start = r.start_date || r.comment_date;
      const end = r.end_date || r.comment_date || start;
      const days = countDaysInclusive(start, end);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.comment_text)}</td>
        <td class="center">${escapeHtml(start)}</td>
        <td class="center">${escapeHtml(end)}</td>
        <td class="center">${days}</td>
        <td class="center"><button class="btn-edit" data-id="${r.id}">Edit</button></td>
        <td class="center"><button class="btn-delete" data-id="${r.id}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    }
  }

  saveBtn?.addEventListener("click", async () => {
    const start_date = startEl.value;
    const end_date = endEl.value;
    const comment_text = (textEl.value || "").trim();

    try {
      validateRange(start_date, end_date);
      if (!comment_text) throw new Error("Type a comment.");
    } catch (err) {
      alert(err.message);
      return;
    }

    const days = countDaysInclusive(start_date, end_date);
    if (!confirm(`Apply this comment to all active students for ${days} date(s)?`)) return;

    saveBtn.disabled = true;
    try {
      const json = await fetchJson(`api/mass-comment/create.php?v=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date, end_date, comment_text })
      });

      textEl.value = "";
      showToast(`Saved + applied to ${json.days_applied || days} date(s).`);
      await loadTable();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      saveBtn.disabled = false;
    }
  });

  tbody?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const delBtn = e.target.closest(".btn-delete");

    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      try {
        const json = await fetchJson(`api/mass-comment/list.php?id=${id}&v=${Date.now()}`);
        const row = (json.data && json.data[0]) ? json.data[0] : null;
        if (!row) return;

        editId.value = row.id;
        editStartDate.value = row.start_date || row.comment_date;
        editEndDate.value = row.end_date || row.comment_date || editStartDate.value;
        editText.value = row.comment_text;

        editModal.style.display = "flex";
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
      return;
    }

    if (delBtn) {
      const id = Number(delBtn.dataset.id);
      if (!confirm("Delete this mass comment and remove it from all students for its full date range?")) return;

      try {
        const json = await fetchJson(`api/mass-comment/delete.php?v=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        showToast(`Deleted + removed from ${json.days_removed || "the selected"} date(s).`);
        await loadTable();
      } catch (e2) {
        console.error(e2);
        alert(e2.message);
      }
    }
  });

  function closeModal() { editModal.style.display = "none"; }
  editClose?.addEventListener("click", closeModal);
  editCancel?.addEventListener("click", closeModal);

  // Avoid stacking multiple window listeners if the SPA initializes this page more than once.
  if (window.__massCommentModalClickHandler) {
    window.removeEventListener("click", window.__massCommentModalClickHandler);
  }
  window.__massCommentModalClickHandler = (e) => {
    if (e.target === editModal) closeModal();
  };
  window.addEventListener("click", window.__massCommentModalClickHandler);

  editSave?.addEventListener("click", async () => {
    const id = Number(editId.value || 0);
    const start_date = editStartDate.value;
    const end_date = editEndDate.value;
    const comment_text = (editText.value || "").trim();

    try {
      if (!id) throw new Error("Missing mass comment ID.");
      validateRange(start_date, end_date);
      if (!comment_text) throw new Error("Comment cannot be blank.");
    } catch (err) {
      alert(err.message);
      return;
    }

    const days = countDaysInclusive(start_date, end_date);
    if (!confirm(`Update this mass comment and re-apply it to ${days} date(s)?`)) return;

    editSave.disabled = true;
    try {
      const json = await fetchJson(`api/mass-comment/update.php?v=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, start_date, end_date, comment_text })
      });
      showToast(`Updated + re-applied to ${json.new_days || days} date(s).`);
      closeModal();
      await loadTable();
    } catch (e3) {
      console.error(e3);
      alert(e3.message);
    } finally {
      editSave.disabled = false;
    }
  });

  loadTable().catch((err) => {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6">${escapeHtml(err.message)}</td></tr>`;
  });

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  function toYMD(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function countDaysInclusive(start, end) {
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    return Math.round((e - s) / 86400000) + 1;
  }
}
