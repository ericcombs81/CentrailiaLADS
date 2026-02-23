export async function initPointSheetAveragesSummaryPage() {
  console.log("point-sheet-averages-summary init");

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

  btnPrint?.addEventListener("click", async () => {
    try {
      await exportReportPreviewToPdf({
        studentText: selectedText(studentSel),
        start: startDate.value,
        end: endDate.value
      });
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  }, { signal });

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
  const res = await fetch(url, { cache: "no-store" });
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

/* ---------------- PDF Export (same approach you already use) ---------------- */

async function exportReportPreviewToPdf({ studentText, start, end }) {
  const preview = document.querySelector('section.report-preview[aria-label="Report Preview"]');
  if (!preview) throw new Error("Could not find report preview section.");

  await ensurePdfLibs();
  const html2canvas = window.html2canvas;
  const { jsPDF } = window.jspdf || {};
  if (!html2canvas || !jsPDF) throw new Error("PDF libraries failed to load.");

  // Letter portrait
  const pageW = 612;
  const pageH = 792;
  const marginX = 36;
  const marginTop = 36;
  const marginBottom = 36;

  const maxWpt = pageW - marginX * 2;
  const maxHpt = pageH - marginTop - marginBottom;

  const ptToPx = 96 / 72;
  const targetCssWidthPx = Math.round(maxWpt * ptToPx);

  // Clone for clean capture
  const clone = preview.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.width = `${targetCssWidthPx}px`;
  clone.style.maxWidth = `${targetCssWidthPx}px`;
  clone.style.overflow = "visible";
  clone.style.transform = "none";
  clone.style.background = "#fff";
  clone.style.zIndex = "999999";
  clone.style.boxSizing = "border-box";
  clone.style.padding = "0";

  document.body.appendChild(clone);
  clone.getBoundingClientRect();

  const canvas = await html2canvas(clone, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    windowWidth: targetCssWidthPx
  });

  document.body.removeChild(clone);

  const imgData = canvas.toDataURL("image/png");

  // Fit to width inside margins
  const imgPxW = canvas.width;
  const imgPxH = canvas.height;

  let drawW = maxWpt;
  let drawH = imgPxH * (drawW / imgPxW);
  if (drawH > maxHpt) {
    drawH = maxHpt;
    drawW = imgPxW * (drawH / imgPxH);
  }

  const x = (pageW - drawW) / 2;
  const y = marginTop;

  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "letter" });
  pdf.addImage(imgData, "PNG", x, y, drawW, drawH);

  const filename = makeFilename("PointSheetAverages", studentText, start, end);
  pdf.save(filename);
}

function makeFilename(prefix, student, start, end) {
  const clean = (s) =>
    String(s || "")
      .replace(/[\/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .trim();

  return `${clean(prefix)}_${clean(student)}_${clean(start)}_${clean(end)}.pdf`;
}

async function ensurePdfLibs() {
  if (window.html2canvas && window.jspdf?.jsPDF) return;
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js", "html2canvas");
  await loadScriptOnce("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", "jspdf");
}

function loadScriptOnce(src, globalNameHint) {
  return new Promise((resolve, reject) => {
    if (globalNameHint === "html2canvas" && window.html2canvas) return resolve();
    if (globalNameHint === "jspdf" && window.jspdf?.jsPDF) return resolve();

    const existing = document.querySelector(`script[data-src="${CSS.escape(src)}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.setAttribute("data-src", src);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}