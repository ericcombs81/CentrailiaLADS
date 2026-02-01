export function initChartByBehaviorPage() {
    console.log("chart-behavior init");

  const now = new Date();
  const central = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const svg = document.getElementById('behaviorChart');

  // Default dates
  const start = new Date(central.getFullYear(), central.getMonth(), 1);
  const end = new Date(central.getFullYear(), central.getMonth(), 10);
  startDate.value = toYMD(start);
  endDate.value = toYMD(end);

  // Meta elements
  const metaStudent = document.getElementById('metaStudent');
  const metaBehavior = document.getElementById('metaBehavior');
  const metaRange = document.getElementById('metaRange');
  const studentSel = document.getElementById('studentSelect');
  const behaviorSel = document.getElementById('behaviorSelect');

  function updateMeta() {
    metaStudent.textContent = studentSel.options[studentSel.selectedIndex].text;
    metaBehavior.textContent = behaviorSel.value;
    metaRange.textContent = `${formatUS(startDate.value)} – ${formatUS(endDate.value)}`;
  }

  // --- Initial sample dataset (10 daily points) ---
  let data = [70, 50, 60, 40, 60, 60, 70, 80, 70, 90];

  renderChart(svg, data);
  updateMeta();

  // Events
  studentSel.addEventListener('change', updateMeta);
  behaviorSel.addEventListener('change', updateMeta);
  startDate.addEventListener('change', updateMeta);
  endDate.addEventListener('change', updateMeta);

  document.getElementById('btnPreview').addEventListener('click', () => {
    // Slightly randomized for realism
    data = data.map(v => clamp(v + (Math.random() * 6 - 3), 60, 100));
    renderChart(svg, data);
  });

  document.getElementById('btnPrint').addEventListener('click', () => window.print());
}

/* ---------- Helpers ---------- */
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatUS(ymd) {
  const [y,m,d] = ymd.split('-');
  return `${m}/${d}/${y}`;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Draw a simple 0–100% line chart
 */
function renderChart(svg, values) {
  const W = 680, H = 300, L = 40, R = 10, T = 10, B = 28;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const stepX = (W - L - R) / (values.length - 1);

  // Gridlines every 20%
  for (let yv = 0; yv <= 100; yv += 20) {
    const y = mapY(yv);
    const grid = line(L, y, W - R, y, '#eee', 1);
    svg.appendChild(grid);

    const label = text(8, y + 4, `${yv}`, '#666', 'middle');
    svg.appendChild(label);
  }

  // Axes
  svg.appendChild(line(L, T, L, H - B, '#999', 1.2));
  svg.appendChild(line(L, H - B, W - R, H - B, '#999', 1.2));

  // X-axis labels (1–10)
  for (let i = 0; i < values.length; i++) {
    const x = L + i * stepX;
    const lbl = text(x, H - B + 16, `${i + 1}`, '#555', 'middle');
    svg.appendChild(lbl);
  }

  // Draw line
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const d = values.map((v,i) => `${i===0?'M':'L'} ${L+i*stepX} ${mapY(v)}`).join(' ');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#cc0100');
  path.setAttribute('stroke-width', '2.5');
  svg.appendChild(path);

  // Plot points
  values.forEach((v, i) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', L + i * stepX);
    c.setAttribute('cy', mapY(v));
    c.setAttribute('r', 4);
    c.setAttribute('fill', '#cc0100');
    svg.appendChild(c);
  });

  function mapY(percent) {
    const usable = (H - B) - T;
    return (H - B) - (percent / 100) * usable;
  }
}

function line(x1, y1, x2, y2, color, width) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
  el.setAttribute('stroke', color);
  el.setAttribute('stroke-width', width);
  return el;
}

function text(x, y, str, color, anchor = 'start') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  el.setAttribute('x', x);
  el.setAttribute('y', y);
  el.setAttribute('font-size', '11');
  el.setAttribute('fill', color);
  el.setAttribute('text-anchor', anchor);
  el.textContent = str;
  return el;
}
