import { secureFetch } from './security.js';

let avgSummaryUiWired = false;

function wireAvgSummaryUiOnce() {
  if (avgSummaryUiWired) return;
  avgSummaryUiWired = true;

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnPrint");
    if (!btn) return;

    // Make sure we're actually on this page (prevents other pages with same id from triggering)
    if (!document.querySelector("section.report-avg-summary")) return;

    try {
      const studentSel = document.getElementById("studentSelect");
      const startDate = document.getElementById("startDate");
      const endDate = document.getElementById("endDate");

      await printAvgSummaryPreview({
        studentText: selectedText(studentSel),
        start: startDate?.value || "",
        end: endDate?.value || ""
      });
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  });
}


export async function initPointSheetAveragesSummaryPage() {
  console.log("point-sheet-averages-summary init");

    wireAvgSummaryUiOnce(); // ✅ add this

  // SPA-safe re-init
  if (window.__avgSummaryAbort) {
    try { window.__avgSummaryAbort.abort(); } catch (_) {}
  }
  const abort = new AbortController();
  window.__avgSummaryAbort = abort;
  const { signal } = abort;

  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  const studentSel = document.getElementById("studentSelect");
  const btnPrint = document.getElementById("btnPrint");

  const metaStudent = document.getElementById("metaStudent");
  const metaRange = document.getElementById("metaRange");

  const rowsHost = document.getElementById("summaryRows");
  const totalAvgEl = document.getElementById("totalAvg");

  if (!startDate || !endDate || !studentSel || !rowsHost || !totalAvgEl) return;

  // Default dates: month-to-date (Central)
  const now = new Date();
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const start = new Date(central.getFullYear(), central.getMonth(), 1);
  startDate.value = toYMD(start);
  endDate.value = toYMD(central);

  studentSel.innerHTML = `<option value="">Select student...</option>`;
  setLoadingState("Select a student to begin.");
  updateMeta();

  await loadStudents();

  const rerenderDebounced = debounce(() => {
    if (signal.aborted) return;
    rerender().catch(err => {
      if (!signal.aborted) console.error(err);
    });
  }, 250);

  studentSel.addEventListener("change", () => { updateMeta(); rerenderDebounced(); }, { signal });
  startDate.addEventListener("change", () => { updateMeta(); rerenderDebounced(); }, { signal });
  endDate.addEventListener("change", () => { updateMeta(); rerenderDebounced(); }, { signal });

  // ---------- functions ----------
  function updateMeta() {
    if (metaStudent) metaStudent.textContent = selectedText(studentSel) || "—";
    if (metaRange) metaRange.textContent = `${formatUS(startDate.value)} – ${formatUS(endDate.value)}`;
  }

  function setLoadingState(msg) {
    rowsHost.innerHTML = `<div class="summary-row"><div>${escapeHtml(msg)}</div><div class="avg">—</div></div>`;
    totalAvgEl.textContent = "—";
  }

  async function loadStudents() {
    const res = await fetchJson(`api/student/list.php?v=${Date.now()}`);

    const students = (res.data || [])
      .filter(s => Number(s.statusValue ?? s.status ?? 0) === 1)
      .map(s => {
        const id = Number(s.id ?? s.ID ?? 0);
        const first = String(s.first || "").trim();
        const last = String(s.last || "").trim();
        return { id, first, last, label: `${last}, ${first}`.trim() };
      })
      .filter(s => s.id > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    studentSel.innerHTML = `<option value="">Select student...</option>`;
    for (const s of students) {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = s.label;
      studentSel.appendChild(opt);
    }
  }

  async function rerender() {
    const student_id = Number(studentSel.value || 0);
    const s = startDate.value;
    const e = endDate.value;

    updateMeta();

    if (!student_id) {
      setLoadingState("Select a student to begin.");
      return;
    }
    if (!s || !e) {
      setLoadingState("Select a date range.");
      return;
    }

    setLoadingState("Loading...");

    const res = await fetchJson(
      `api/reports/point-sheet-averages-summary.php?student_id=${encodeURIComponent(student_id)}&start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}&v=${Date.now()}`
    );

    const rows = res.data?.rows || [];
    const total = res.data?.total_avg ?? "0.00";

    if (!rows.length) {
      setLoadingState("No assigned behaviors in this range.");
      totalAvgEl.textContent = "—";
      return;
    }

    rowsHost.innerHTML = "";
    for (const r of rows) {
      const name = String(r.behavior_text || "").trim();
      const avg = (r.avg_pct == null) ? "0.00" : String(r.avg_pct);

      const row = document.createElement("div");
      row.className = "summary-row";
      row.innerHTML = `<div>${escapeHtml(name)}</div><div class="avg">${escapeHtml(avg)}</div>`;
      rowsHost.appendChild(row);
    }

    totalAvgEl.textContent = String(total);
  }
}

/* ---------------- Helpers ---------------- */

function selectedText(sel) {
  if (!sel) return "";
  const idx = sel.selectedIndex;
  if (idx == null || idx < 0) return "";
  return sel.options?.[idx]?.text || "";
}

function debounce(fn, waitMs) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

async function fetchJson(url) {
  const res = await secureFetch(url, { cache: "no-store" });
  const raw = await res.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error("Server did not return JSON: " + raw.slice(0, 200)); }
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json;
}

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatUS(ymd) {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return "—";
  return `${m}/${d}/${y}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------- Print (no external libs; same pattern as student.js) ---------------- */

let avgSummaryPrintStyleInjected = false;

function ensureAvgSummaryPrintArea() {
  let el = document.getElementById("avgSummaryPrintArea");
  if (!el) {
    el = document.createElement("div");
    el.id = "avgSummaryPrintArea";
    el.className = "avg-summary-print-area";
    el.setAttribute("aria-label", "Averages Summary Print Area");
    // hidden on screen; visible only during print via injected @media print rules
    el.style.display = "none";
    document.body.appendChild(el);
  }
  return el;
}

function ensureAvgSummaryPrintStyle() {
  if (avgSummaryPrintStyleInjected) return;
  avgSummaryPrintStyleInjected = true;

  const style = document.createElement("style");
  style.id = "avgSummaryPrintStyle";
  style.textContent = `
@media print {
  @page { size: letter landscape; margin: 0.25in; }

  /* Print ONLY what we inject into #avgSummaryPrintArea */
  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
  }

  body.avg-summary-is-printing * { visibility: hidden !important; }

  body.avg-summary-is-printing #avgSummaryPrintArea,
  body.avg-summary-is-printing #avgSummaryPrintArea * {
    visibility: visible !important;
  }

  body.avg-summary-is-printing #avgSummaryPrintArea {
    display: block !important;
    position: absolute !important;
    inset: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }

  body.avg-summary-is-printing #avgSummaryPrintArea .paper {
    width: 100% !important;
    max-width: none !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
}
`;
  document.head.appendChild(style);
}

async function printAvgSummaryPreview({ studentText, start, end }) {
  // grab the "paper" so we print a clean 1-page report
  const paper = document.getElementById("avgSummaryPaper")
    || document.querySelector("section.report-preview .paper");
  if (!paper) throw new Error("Could not find #avgSummaryPaper to print.");

  ensureAvgSummaryPrintStyle();
  const printArea = ensureAvgSummaryPrintArea();

  const prevTitle = document.title;
  const titleBits = [
    "Point Sheet Averages",
    (studentText || "").trim(),
    (start && end) ? `${start} to ${end}` : ""
  ].filter(Boolean);

  document.title = titleBits.join(" - ");

  const cleanup = () => {
    document.body.classList.remove("avg-summary-is-printing");
    printArea.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  try {
    // Clone current paper (already reflects selected student/range + injected rows)
    const clone = paper.cloneNode(true);

    // Optional: force white background so printers don't gray it out
    clone.style.background = "#fff";

    printArea.innerHTML = "";
    printArea.appendChild(clone);
    document.body.classList.add("avg-summary-is-printing");

    window.print();
  } finally {
    document.title = prevTitle;
    setTimeout(cleanup, 1000);
  }
}
