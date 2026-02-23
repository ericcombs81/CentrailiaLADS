export async function initReportPointSheetsPage() {
  console.log("report-point-sheets init");

  // SPA-safe init
  if (window.__rpsAbort) {
    try { window.__rpsAbort.abort(); } catch (_) {}
  }
  const abort = new AbortController();
  window.__rpsAbort = abort;
  const { signal } = abort;

  const dateEl = document.getElementById("rpsDate");
  const btnPrint = document.getElementById("rpsPrint");
  const printArea = document.getElementById("rpsPrintArea");
  const countEl = document.getElementById("rpsCount");

  if (!dateEl || !btnPrint || !printArea) return;

  // Default date = today (Central)
  const now = new Date();
  const central = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  dateEl.value = toYMD(central);

  btnPrint.disabled = true;
  if (countEl) countEl.textContent = "";
  printArea.innerHTML = "";

  dateEl.addEventListener("change", () => {
    loadForDate(dateEl.value).catch(console.error);
  }, { signal });

  btnPrint.addEventListener("click", () => {
    // Hide browser print header title as much as possible
    const prevTitle = document.title;
    document.title = "";
    try {
      window.print();
    } finally {
      // Restore after print dialog closes
      setTimeout(() => { document.title = prevTitle; }, 0);
    }
  }, { signal });

  await loadForDate(dateEl.value);

  async function loadForDate(ymd) {
    btnPrint.disabled = true;
    if (countEl) countEl.textContent = "";
    printArea.innerHTML = "";

    if (!ymd) return;

    // Ask server to render FULL student-style print sheets (hidden)
    const res = await fetchJson(
      `api/reports/render-point-sheets.php?date=${encodeURIComponent(ymd)}&v=${Date.now()}`
    );

    printArea.innerHTML = res.html || "";

    const n = Number(res.count || 0);
    if (countEl) countEl.textContent = `${n} student(s)`;
    btnPrint.disabled = n === 0;
  }
}

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

