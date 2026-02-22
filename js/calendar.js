export async function initCalendarPage() {
  console.log("calendar init");

  // SPA-safe re-init
  if (window.__calAbort) {
    try { window.__calAbort.abort(); } catch (_) {}
  }
  const abort = new AbortController();
  window.__calAbort = abort;
  const { signal } = abort;

  const yearSel = document.getElementById("schoolYearSelect");
  const grid = document.getElementById("calendarGrid");
  const btnSave = document.getElementById("btnSaveCalendar");
  const toast = document.getElementById("calSavedToast");

  if (!yearSel || !grid || !btnSave) return;

  // Build year options (current school year ±2)
  const now = new Date();
  const y = now.getFullYear();
  // If we're before Aug, current school year started last year
  const likelyStart = (now.getMonth() < 7) ? (y - 1) : y;

  yearSel.innerHTML = "";
  for (let ys = likelyStart - 2; ys <= likelyStart + 2; ys++) {
    const opt = document.createElement("option");
    opt.value = String(ys);
    opt.textContent = `${ys}-${ys + 1}`;
    yearSel.appendChild(opt);
  }
  yearSel.value = String(likelyStart);

  // State: map date -> { no_school, note }
  let dayState = new Map(); // key: "YYYY-MM-DD" -> {no_school:0/1, note:""}
  let dirtyDates = new Set();

  // Render initial
  await loadAndRender();

  yearSel.addEventListener("change", () => {
    loadAndRender().catch(console.error);
  }, { signal });

  btnSave.addEventListener("click", async () => {
    try {
      await saveChanges();
      showToast("Saved ✓");
    } catch (e) {
      console.error(e);
      alert(e.message || String(e));
    }
  }, { signal });

  async function loadAndRender() {
    const yearStart = Number(yearSel.value || 0);
    dayState = new Map();
    dirtyDates = new Set();

    grid.innerHTML = `<div style="padding:12px;font-weight:900;color:#666;">Loading calendar...</div>`;

    const res = await fetchJson(`api/calendar/list.php?year_start=${encodeURIComponent(yearStart)}&v=${Date.now()}`);
    const days = res.data?.days || [];

    for (const row of days) {
      const date = String(row.calendar_date);
      dayState.set(date, {
        no_school: Number(row.no_school || 0) ? 1 : 0,
        note: row.note ? String(row.note) : ""
      });
    }

    renderSchoolYear(grid, yearStart);
  }

  function renderSchoolYear(container, yearStart) {
    container.innerHTML = "";

    // months Aug(7) .. Dec(11) of yearStart, then Jan(0) .. Jul(6) of yearStart+1
    const months = [
      { y: yearStart, m: 7 }, { y: yearStart, m: 8 }, { y: yearStart, m: 9 }, { y: yearStart, m: 10 }, { y: yearStart, m: 11 },
      { y: yearStart + 1, m: 0 }, { y: yearStart + 1, m: 1 }, { y: yearStart + 1, m: 2 }, { y: yearStart + 1, m: 3 },
      { y: yearStart + 1, m: 4 }, { y: yearStart + 1, m: 5 }, { y: yearStart + 1, m: 6 },
    ];

    for (const { y, m } of months) {
      container.appendChild(renderMonth(y, m));
    }
  }

  function renderMonth(year, monthIndex) {
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const week = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    const wrap = document.createElement("div");
    wrap.className = "cal-month";

    const title = document.createElement("div");
    title.className = "cal-month-title";
    title.innerHTML = `<span>${monthNames[monthIndex]}</span><span class="sub">${year}</span>`;
    wrap.appendChild(title);

    const weekdays = document.createElement("div");
    weekdays.className = "cal-weekdays";
    for (const d of week) {
      const cell = document.createElement("div");
      cell.textContent = d;
      weekdays.appendChild(cell);
    }
    wrap.appendChild(weekdays);

    const daysGrid = document.createElement("div");
    daysGrid.className = "cal-days";

    const first = new Date(year, monthIndex, 1);
    const startDow = first.getDay(); // 0 Sun
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // leading blanks
    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-day empty";
      daysGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      const ymd = toYMD(d);
      const dow = d.getDay();
      const isWeekend = (dow === 0 || dow === 6);

      const cell = document.createElement("div");
      cell.className = "cal-day";
      cell.dataset.date = ymd;
      cell.textContent = String(day);

      if (isWeekend) cell.classList.add("weekend");

      const state = dayState.get(ymd);
      if (state?.no_school) cell.classList.add("no-school");

      const check = document.createElement("div");
      check.className = "check";
      cell.appendChild(check);

      cell.addEventListener("click", () => {
        // toggle no-school; weekends stay weekend style but can also be marked no-school if you want
        const cur = dayState.get(ymd) || { no_school: 0, note: "" };
        const next = cur.no_school ? 0 : 1;
        dayState.set(ymd, { ...cur, no_school: next });
        dirtyDates.add(ymd);

        cell.classList.toggle("no-school", !!next);
      }, { signal });

      daysGrid.appendChild(cell);
    }

    wrap.appendChild(daysGrid);
    return wrap;
  }

  async function saveChanges() {
    const yearStart = Number(yearSel.value || 0);
    if (!yearStart) throw new Error("Invalid school year");

    if (dirtyDates.size === 0) {
      showToast("No changes");
      return;
    }

    const payloadDays = [];
    for (const date of dirtyDates) {
      const st = dayState.get(date) || { no_school: 0, note: "" };
      payloadDays.push({ date, no_school: st.no_school ? 1 : 0, note: st.note || "" });
    }

    await fetchJson("api/calendar/save.php", {
      method: "POST",
      body: JSON.stringify({ year_start: yearStart, days: payloadDays }),
      headers: { "Content-Type": "application/json" }
    });

    dirtyDates.clear();
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    setTimeout(() => { if (toast.textContent === msg) toast.textContent = ""; }, 1600);
  }
}

/* ---------- helpers ---------- */

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchJson(url, opts) {
  const res = await fetch(url, { cache: "no-store", ...(opts || {}) });
  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("Server did not return JSON: " + raw.slice(0, 200)); }
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}
