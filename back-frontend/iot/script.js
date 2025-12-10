const API_BASE = "http://localhost:5000";

let levelChart;
let percentChart;            // ✅ กราฟ Percent
let viewCount = 20;
let allRowsCache = [];

// helper: เวลา
function toTimeString(d) {
  try { return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  catch { return "-"; }
}

// ====== สร้างกราฟ ======
function ensureCharts() {
  // กราฟ Level (หลัก)
  if (!levelChart) {
    const el = document.getElementById("waterChart");
    if (el) {
      levelChart = new Chart(el, {
        type: "bar",
        data: { labels: [], datasets: [{
          label: "ระดับน้ำ (cm)",
          data: [],
          borderColor: "rgba(0,150,255,1)",
          backgroundColor: "rgba(0,150,255,0.3)",
          borderWidth: 2, tension: 0.3,
        }]},
        options: {
          responsive: true, animation: false,
          plugins: { legend: { position: "top" } },
          scales: {
            x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
            y: { beginAtZero: true },
          },
        },
      });
    }
  }

  // ✅ กราฟ Percent (%)
  if (!percentChart) {
    const el2 = document.getElementById("percentChart");
    if (el2) {
      percentChart = new Chart(el2, {
        type: "line",
        data: { labels: [], datasets: [{
          label: "Percent (%)",
          data: [],
          borderColor: "rgba(255,99,132,1)",
          backgroundColor: "rgba(255,99,132,0.25)",
          borderWidth: 2, tension: 0.3,
        }]},
        options: {
          responsive: true, animation: false,
          plugins: { legend: { position: "top" } },
          scales: {
            x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
            y: { beginAtZero: true, max: 100 },
          },
        },
      });
    }
  }
}

// ====== อัปเดตกาฟ ======
function updateCharts(rows) {
  if (Array.isArray(rows)) allRowsCache = rows;

  const base   = allRowsCache;
  const series = (viewCount === "all") ? base : base.slice(-Number(viewCount));

  const labels   = series.map(r => toTimeString(r.createat || r.createdAt));
  const levels   = series.map(r => Number(r.level_cm));
  const percents = series.map(r => Number(r.percent));

  ensureCharts();

  if (levelChart) {
    levelChart.data.labels = labels;
    levelChart.data.datasets[0].data = levels;
    const xTicks = levelChart.options.scales.x.ticks;
    xTicks.autoSkip = series.length > 10;
    xTicks.maxTicksLimit = Math.min(series.length, 10);
    levelChart.update();
  }

  if (percentChart) {
    percentChart.data.labels = labels;
    percentChart.data.datasets[0].data = percents;
    const xTicks2 = percentChart.options.scales.x.ticks;
    xTicks2.autoSkip = series.length > 10;
    xTicks2.maxTicksLimit = Math.min(series.length, 10);
    percentChart.update();
  }
}

// ====== ตาราง / KPI / ฟังก์ชันอื่นๆ ======
function renderTable(rows) {
  const tb = document.querySelector("#tbl tbody");
  if (!tb) return;
  tb.innerHTML = "";
  rows.forEach((r, i) => {
    const when = r.createat || r.createdAt;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${toTimeString(when)}</td>
      <td>${r.ts ?? "-"}</td>
      <td>${Number(r.distance_cm).toFixed(1)}</td>
      <td>${Number(r.level_cm).toFixed(1)}</td>
      <td class="right">${Number(r.percent).toFixed(1)}</td>
    `;
    tb.appendChild(tr);
  });
  const countLabel = document.getElementById("countLabel");
  if (countLabel) countLabel.textContent = `${rows.length.toLocaleString("th-TH")} records`;
}

function renderKpis(latest) {
  const d = (id) => document.getElementById(id);
  (d("kpiDistance")||{}).textContent = latest ? Number(latest.distance_cm).toFixed(1) : "—";
  (d("kpiLevel")||{}).textContent    = latest ? Number(latest.level_cm).toFixed(1)    : "—";
  (d("kpiPercent")||{}).textContent  = latest ? `${Number(latest.percent).toFixed(1)}%` : "—";
}

function renderWaterStatus(latest) {
  const box = document.getElementById("dustStatus");
  if (!box) return;
  if (!latest) { box.textContent = "ไม่มีข้อมูลระดับน้ำ"; box.style.background = "#6b7280"; return; }
  const p = Number(latest.percent);
  if (p > 80)      { box.style.background = "#3b82f6"; box.textContent = `ระดับน้ำ: สูง (${p.toFixed(1)}%)`; }
  else if (p > 40) { box.style.background = "#0ea5e9"; box.textContent = `ระดับน้ำ: ปานกลาง (${p.toFixed(1)}%)`; }
  else if (p > 20) { box.style.background = "#facc15"; box.textContent = `ระดับน้ำ: ต่ำ (${p.toFixed(1)}%)`; }
  else             { box.style.background = "#ef4444"; box.textContent = `ระดับน้ำ: ใกล้หมด (${p.toFixed(1)}%)`; }
}

// ====== ✅ เช็กสถานะการเชื่อมต่อบอร์ด ======
function checkConnectionStatus(latest) {
  const box = document.getElementById("boardStatus");
  if (!box) return;

  if (!latest || !latest.createat) {
    box.textContent = "❌ ไม่พบข้อมูลจากบอร์ด";
    box.style.background = "#ef4444"; // แดง
    return;
  }

  const diffSec = (Date.now() - new Date(latest.createat).getTime()) / 1000;

  if (diffSec < 10) {
    box.textContent = "✅ บอร์ดเชื่อมต่ออยู่ (Online)";
    box.style.background = "#22c55e"; // เขียว
  } else if (diffSec < 15) {
    box.textContent = "⚠️ สัญญาณล่าช้าเล็กน้อย";
    box.style.background = "#f59e0b"; // เหลือง
  } else {
    box.textContent = "❌ บอร์ดขาดการเชื่อมต่อ (Offline)";
    box.style.background = "#ef4444"; // แดง
  }
}

async function fetchAll()   { const r = await fetch(`${API_BASE}/all`);   if (!r.ok) throw new Error("fetch /all failed"); return r.json(); }
async function fetchLatest(){ const r = await fetch(`${API_BASE}/`);      if (!r.ok) throw new Error("fetch / failed");     return r.json(); }

async function refresh() {
  try {
    const [all, latest] = await Promise.all([fetchAll(), fetchLatest()]);
    renderTable(all);
    renderKpis(latest);
    renderWaterStatus(latest);
    checkConnectionStatus(latest);     // ✅ เรียกเช็กสถานะตรงนี้
    updateCharts(all);
  } catch (e) { console.error(e); }
}

function setActiveViewButton(count) {
  document.querySelectorAll("#viewControls .view-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.count == count);
  });
}

function wireViewButtons() {
  const container = document.getElementById("viewControls");
  if (!container) return;
  container.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.count;
      viewCount = (val === "all") ? "all" : parseInt(val, 10);
      setActiveViewButton(val);
      updateCharts();                  // ใช้ cache เดิม อัปเดตทันที
    });
  });
  setActiveViewButton(String(viewCount));
}

function wireRefreshButton() {
  const btn = document.getElementById("btnRefresh");
  if (btn) btn.addEventListener("click", refresh);
}

document.addEventListener("DOMContentLoaded", () => {
  ensureCharts();
  wireViewButtons();
  wireRefreshButton();
  refresh();
  setInterval(refresh, 2000);
});
