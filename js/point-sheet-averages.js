export async function initPointSheetAveragesPage() {
  console.log("point-sheet-averages init");

  // SPA-safe re-init
  if (window.__psaAbort) {
    try { window.__psaAbort.abort(); } catch (_) {}
  }
  const abort = new AbortController();
  window.__psaAbort = abort;
  const { signal } = abort;

  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  const studentSel = document.getElementById("studentSelect");
  const svg = document.getElementById("avgChart");

  const metaStudent = document.getElementById("metaStudent");
  const metaRange = document.getElementById("metaRange");

  const btnPrint = document.getElementById("btnPrint");

  if (!startDate || !endDate || !studentSel || !svg) return;

  // Default dates: month-to-date (Central)
  const now = new Date();
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const monthStart = new Date(central.getFullYear(), central.getMonth(), 1);
  startDate.value = toYMD(monthStart);
  endDate.value = toYMD(central);

  studentSel.innerHTML = `<option value="">Select student...</option>`;

  clearChart(svg, "Select a student to view averages.");
  updateMeta();

  await loadStudents();

  const rerenderDebounced = debounce(() => {
    if (signal.aborted) return;
    rerender().catch(err => {
      if (!signal.aborted) console.error(err);
    });
  }, 250);

  studentSel.addEventListener("change", () => {
    updateMeta();
    rerenderDebounced();
  }, { signal });

  startDate.addEventListener("change", () => {
    updateMeta();
    rerenderDebounced();
  }, { signal });

  endDate.addEventListener("change", () => {
    updateMeta();
    rerenderDebounced();
  }, { signal });

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

  function updateMeta() {
    if (metaStudent) metaStudent.textContent = selectedText(studentSel) || "—";
    if (metaRange) metaRange.textContent = `${formatUS(startDate.value)} – ${formatUS(endDate.value)}`;
  }

  async function loadStudents() {
    const res = await fetchJson(`api/student/list.php?v=${Date.now()}`);

    const students = (res.data || [])
      .filter(s => Number(s.statusValue ?? s.status ?? 0) === 1)
      .map(s => {
        const id = Number(s.id ?? s.ID ?? 0);
        const first = String(s.first || "").trim();
        const last = String(s.last || "").trim();
        return { id, label: `${last}, ${first}`.trim() };
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

    if (!student_id) {
      clearChart(svg, "Select a student to view averages.");
      return;
    }

    clearChart(svg, "Loading chart...");

    const rows = await fetchJson(
      `api/reports/point-sheet-averages-series.php?student_id=${encodeURIComponent(student_id)}&start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}&v=${Date.now()}`
    );

    const data = rows.data || [];
    if (!data.length) {
      clearChart(svg, "No recorded point sheet data in this date range.");
      return;
    }

    const points = data.map(r => ({
      xLabel: shortMD(r.date),
      y: Number(r.pct || 0),
    }));

    renderChart(svg, points);
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

function shortMD(ymd) {
  const [y, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function clearChart(svg, msg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute("viewBox", "0 0 900 420");


  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", "340");
  label.setAttribute("y", "150");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("fill", "#666");
  label.setAttribute("font-size", "14");
  label.textContent = msg || "";
  svg.appendChild(label);
}

/**
 * points: [{xLabel, y}] where y in 0..100
 * (Only axes + red series; no extra gridlines)
 */
function renderChart(svg, points) {
  if (!svg || !Array.isArray(points) || points.length < 2) {
    clearChart(svg, "Not enough data to chart.");
    return;
  }

  const W = 900, H = 420, L = 50, R = 70, T = 16, B = 40;

  svg.setAttribute("viewBox", "0 0 900 420");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Y labels only (no grid lines)
  for (let yv = 0; yv <= 100; yv += 20) {
    const y = mapY(yv);
    svg.appendChild(text(10, y + 4, `${yv}`, "#666", "start"));
  }

  // Axes ONLY
  svg.appendChild(line(L, T, L, H - B, "#999", 1.2));
  svg.appendChild(line(L, H - B, W - R, H - B, "#999", 1.2));

  const n = points.length;
  const stepX = (W - L - R) / (n - 1);

  const maxLabels = 12;
  const stride = Math.max(1, Math.ceil(n / maxLabels));

  for (let i = 0; i < n; i++) {
    if (i % stride !== 0 && i !== n - 1) continue;
    const x = L + i * stepX;
    svg.appendChild(text(x, H - B + 16, points[i].xLabel, "#555", "middle"));
  }

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${L + i * stepX} ${mapY(p.y)}`).join(" ");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#cc0100");
  path.setAttribute("stroke-width", "2.5");
  svg.appendChild(path);

  points.forEach((p, i) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", L + i * stepX);
    c.setAttribute("cy", mapY(p.y));
    c.setAttribute("r", 4);
    c.setAttribute("fill", "#cc0100");
    svg.appendChild(c);
  });

  function mapY(percent) {
    const usable = (H - B) - T;
    return (H - B) - (percent / 100) * usable;
  }
}

function line(x1, y1, x2, y2, color, width) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
  el.setAttribute("x1", x1);
  el.setAttribute("y1", y1);
  el.setAttribute("x2", x2);
  el.setAttribute("y2", y2);
  el.setAttribute("stroke", color);
  el.setAttribute("stroke-width", width);
  return el;
}

function text(x, y, str, color, anchor = "start") {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("font-size", "11");
  el.setAttribute("fill", color);
  el.setAttribute("text-anchor", anchor);
  el.textContent = str;
  return el;
}

/* ---------------- PDF Export (same approach as chart-behavior) ---------------- */

async function exportReportPreviewToPdf({ studentText, start, end }) {
  const preview = document.querySelector('section.report-preview[aria-label="Report Preview"]');
  if (!preview) throw new Error("Could not find report preview section.");

  await ensurePdfLibs();
  const html2canvas = window.html2canvas;
  const { jsPDF } = window.jspdf || {};
  if (!html2canvas || !jsPDF) throw new Error("PDF libraries failed to load.");

  const pageW = 612;
  const pageH = 792;
  const marginX = 36;
  const marginTop = 36;
  const marginBottom = 36;

  const maxWpt = pageW - marginX * 2;
  const maxHpt = pageH - marginTop - marginBottom;

  const ptToPx = 96 / 72;
  const targetCssWidthPx = Math.round(maxWpt * ptToPx);

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

  // small right gutter (prevents right-edge chop without huge margin)
  clone.style.boxSizing = "border-box";
  clone.style.paddingRight = "30px";

  const paper = clone.querySelector(".paper");
  if (paper) {
    paper.style.boxSizing = "border-box";
    paper.style.paddingRight = "16px";
    paper.style.overflow = "visible";
    paper.style.boxShadow = "none";
    paper.style.borderRadius = "0";
    paper.style.width = "100%";
    paper.style.maxWidth = "100%";
  }

  document.body.appendChild(clone);
  clone.getBoundingClientRect();

  const canvas = await html2canvas(clone, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true
  });

  document.body.removeChild(clone);

  const imgData = canvas.toDataURL("image/png");

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
