let allActiveStudents = [];
let currentStudentId = 0;
let assignedSet = new Set();
let dirty = false;

function showToast(message, duration = 1500) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.background = "#0e3cf2";
    toast.style.color = "white";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "10px";
    toast.style.fontWeight = "700";
    toast.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "opacity .2s ease, transform .2s ease";
    toast.style.zIndex = "99999";
    toast.style.pointerEvents = "none";
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  // force reflow so transition always plays
  toast.style.opacity = "0";
  toast.style.transform = "translateY(10px)";
  void toast.offsetHeight;

  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
  }, duration);
}

function setDirty(v) {
  dirty = v;
  const btn = document.getElementById("saveAssignmentsBtn");
  if (btn) btn.disabled = !v || !currentStudentId;
}

function updateTotal() {
  const el = document.getElementById("assignedTotal");
  if (el) el.textContent = String(assignedSet.size);
}

async function loadActiveStudentsIntoDropdown() {
  const sel = document.getElementById("student");
  if (!sel) return;

  sel.innerHTML = `<option value="">Select student...</option>`;

  const res = await fetch("api/student/list.php?v=" + Date.now(), { cache: "no-store" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to load students");

  allActiveStudents = (json.data || [])
    .filter((s) => Number(s.statusValue) === 1)
    .map((s) => {
      const first = String(s.first || "").trim();
      const last = String(s.last || "").trim();
      return {
        id: String(s.id),
        first,
        last,
        label: `${first} ${last}`.trim(),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  allActiveStudents.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.label;
    sel.appendChild(opt);
  });
}

function initStudentTypeahead() {
  const input = document.getElementById("studentSearch");
  const suggest = document.getElementById("studentSuggest");
  const sel = document.getElementById("student");
  if (!input || !suggest || !sel) return;

  let matches = [];
  let activeIndex = 0;

  const normalize = (s) => String(s || "").toLowerCase();

  function filterStudents(q) {
    const query = normalize(q).trim();
    if (!query) return [];

    return allActiveStudents
      .filter((s) => {
        const a = normalize(s.label);
        const b = normalize(`${s.last} ${s.first}`);
        return a.includes(query) || b.includes(query);
      })
      .slice(0, 50);
  }

  function render() {
    suggest.innerHTML = "";

    if (!input.value.trim()) {
      suggest.style.display = "none";
      return;
    }

    if (matches.length === 0) {
      const div = document.createElement("div");
      div.className = "student-suggest-empty";
      div.textContent = "No matches";
      suggest.appendChild(div);
      suggest.style.display = "block";
      return;
    }

    matches.forEach((s, idx) => {
      const div = document.createElement("div");
      div.className = "student-suggest-item" + (idx === activeIndex ? " active" : "");
      div.textContent = s.label;

      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectStudent(s);
      });

      suggest.appendChild(div);
    });

    suggest.style.display = "block";
  }

  function refreshMatches() {
    matches = filterStudents(input.value);
    activeIndex = 0;
    render();
  }

  function selectStudent(s) {
    sel.value = s.id;
    input.value = s.label;
    suggest.style.display = "none";
    suggest.innerHTML = "";

    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  input.addEventListener("input", refreshMatches);

  input.addEventListener("keydown", (e) => {
    if (suggest.style.display === "none") {
      if (e.key === "ArrowDown") {
        refreshMatches();
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (matches.length === 0) return;
      activeIndex = Math.min(activeIndex + 1, matches.length - 1);
      render();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (matches.length === 0) return;
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length === 0) return;
      selectStudent(matches[activeIndex] || matches[0]);
      return;
    }

    if (e.key === "Escape") {
      suggest.style.display = "none";
      suggest.innerHTML = "";
      return;
    }
  });

  input.addEventListener("focus", refreshMatches);

  input.addEventListener("blur", () => {
    setTimeout(() => {
      suggest.style.display = "none";
      suggest.innerHTML = "";
    }, 120);
  });

  sel.addEventListener("change", () => {
    const chosen = allActiveStudents.find((s) => s.id === sel.value);
    if (chosen) input.value = chosen.label;
  });
}

async function loadAllBehaviors() {
  const res = await fetch("api/behaviors/list.php?v=" + Date.now(), { cache: "no-store" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to load behaviors");
  return json.data || [];
}

async function loadAssignedBehaviorIds(student_id) {
  const res = await fetch(
    `api/student-behaviors/list-current.php?student_id=${encodeURIComponent(student_id)}&v=${Date.now()}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Failed to load assignments");
  return (json.data || []).map(Number);
}

function renderBehaviorTable(behaviors) {
  const tbody = document.getElementById("behaviorsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  behaviors.forEach((b) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = b.behavior_text;
    tr.appendChild(tdName);

    const tdDef = document.createElement("td");
    tdDef.className = "center";
    tdDef.textContent = Number(b.is_default) === 1 ? "Yes" : "No";
    tr.appendChild(tdDef);

    const tdChk = document.createElement("td");
    tdChk.className = "center";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.behaviorId = String(b.behavior_id);
    cb.checked = assignedSet.has(Number(b.behavior_id));

    cb.addEventListener("change", () => {
      const id = Number(cb.dataset.behaviorId);
      if (cb.checked) assignedSet.add(id);
      else assignedSet.delete(id);

      updateTotal();
      setDirty(true);
    });

    tdChk.appendChild(cb);
    tr.appendChild(tdChk);

    tbody.appendChild(tr);
  });
}

async function refreshForStudent(student_id) {
  currentStudentId = student_id;
  assignedSet = new Set();
  const section = document.getElementById("behaviorSection");
  const hint = document.getElementById("assignHint");
  setDirty(false);

  const saveBtn = document.getElementById("saveAssignmentsBtn");
  if (saveBtn) saveBtn.disabled = !student_id;

  if (!student_id) {
    if (section) section.style.display = "none";
    if (hint) hint.style.display = "none";
    renderBehaviorTable([]);
    updateTotal();
    return;
  }

  if (section) section.style.display = "block";
  if (hint) hint.style.display = "none";

  const [behaviors, assigned] = await Promise.all([
    loadAllBehaviors(),
    loadAssignedBehaviorIds(student_id),
  ]);

  assignedSet = new Set(assigned);
  updateTotal();

  // Sort: defaults first, then alphabetical
  behaviors.sort((a, b) => {
    const da = Number(a.is_default) === 1 ? 0 : 1;
    const db = Number(b.is_default) === 1 ? 0 : 1;
    if (da !== db) return da - db;
    return String(a.behavior_text || "").localeCompare(String(b.behavior_text || ""));
  });

  renderBehaviorTable(behaviors);
  setDirty(false);
}

async function saveAssignments() {
  if (!currentStudentId) return;

  const payload = {
    student_id: currentStudentId,
    behavior_ids: Array.from(assignedSet.values()),
  };

  const btn = document.getElementById("saveAssignmentsBtn");
  if (btn) btn.disabled = true;

  const res = await fetch("api/student-behaviors/save.php?v=" + Date.now(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("Server did not return JSON: " + raw.slice(0, 200)); }

  if (!json.ok) throw new Error(json.error || "Save failed");

  setDirty(false);
  if (btn) btn.disabled = false;

  // ✅ Toast like the student page
  showToast("Saved Successfully!", 1500);
}

function wireAddBehaviorModal() {
  const openBtn = document.getElementById("addBehaviorBtn");
  const modal = document.getElementById("addBehaviorModal");
  const closeBtn = document.getElementById("closeAddBehavior");
  const form = document.getElementById("addBehaviorForm");

  if (!openBtn || !modal || !closeBtn || !form) return;

  openBtn.addEventListener("click", () => {
    form.reset();
    modal.style.display = "flex";
    document.getElementById("behaviorTextInput")?.focus();
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const txt = document.getElementById("behaviorTextInput")?.value?.trim() || "";
      const is_default = Number(document.getElementById("behaviorDefaultInput")?.value || 0);

      if (!txt) return;

      // Match api/behaviors/create.php (reads $_POST)
      const body = new URLSearchParams();
      body.set("behavior_text", txt);
      body.set("is_default", String(is_default));

      const res = await fetch("api/behaviors/create.php?v=" + Date.now(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Create failed");

      // Close + refresh table for current student
      modal.style.display = "none";
      form.reset();
      await refreshForStudent(currentStudentId);
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

export async function initCustomizeBehaviorsPage() {
  await loadActiveStudentsIntoDropdown();
  initStudentTypeahead();
  wireAddBehaviorModal();

  document.getElementById("student")?.addEventListener("change", () => {
    const sid = Number(document.getElementById("student")?.value || 0);
    refreshForStudent(sid).catch(console.error);
  });

  document.getElementById("saveAssignmentsBtn")?.addEventListener("click", () => {
    saveAssignments().catch(err => { console.error(err); alert(err.message); });
  });

  updateTotal();
  renderBehaviorTable([]);
}

