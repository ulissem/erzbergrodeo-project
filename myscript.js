const API_URL =
  "https://api.raceresult.com/341508/MRZHEBCS0R2X3WGCZLWHDFS46SLBA7FD";

async function fetchData() {
  const res = await fetch(API_URL);
  const data = await res.json();
  return data;
}

function dToMs(t) {
  const parts = t.split(":");
  if (parts.length < 3) return Infinity;
  const [h, m, s] = parts;
  return +h * 3600 + +m * 60 + parseFloat(s.replace(",", "."));
}

function updateLeaderboard(data) {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";

  data.forEach((r) => {
    r.lastCPNum = 0;
    for (let i = 27; i >= 1; i--) {
      if (r["CP" + i]) {
        r.lastCPNum = i;
        break;
      }
    }
  });

  const getBarColor = (percent) => {
    if (percent >= 100) return "#22c55e"; // green-500 → ✅ "complete"
    if (percent >= 80) return "#84cc16"; // lime-500 → strong greenish-yellow
    if (percent >= 60) return "#facc15"; // yellow-400 → ⚠️ "decent progress"
    if (percent >= 40) return "#fb923c"; // orange-400 → 🟠 "halfway"
    if (percent >= 20) return "#f87171"; // red-400 → 🔴 "early"
    return "#ef4444"; // red-500 → ❗ "just started"
  };

  const sorted = data
    .filter((r) => r.lastCPNum > 0)
    .sort((a, b) => {
      if (b.lastCPNum !== a.lastCPNum) return b.lastCPNum - a.lastCPNum;
      return dToMs(a.ERZ_Time) - dToMs(b.ERZ_Time);
    })
    .slice(0, 50);

  sorted.forEach((r, i) => {
    const tr = document.createElement("tr");
    const percent = Math.round((r.lastCPNum / 27) * 100);
    tr.innerHTML = `
  <td>${i + 1}</td>
  <td>${r.ERZ_Number}</td>
  <td>
    <div><strong>${r.DisplayNameERZ}</strong></div>
    <div style="font-size: 0.85em; color: #555;">
      <img src="https://flagcdn.com/16x12/${(r.Nation || "").toLowerCase()}.png"
        alt="${r.Nation}" 
        class="flag-icon"
        style="vertical-align: middle; margin-right: 4px; width: 16px; height: 12px;" />
      ${r.Nation || "N/A"} &middot; ${r.Bike || "Unknown"}
    </div>
  </td>
  <td>${r.ERZ_Time || "-"}</td>
  <td>
    <div class="progress-wrapper">
      <div class="progress-bar" style="width: ${percent}%; background: ${getBarColor(
      percent
    )};">
      </div>
      <div class="progress-label">${percent}%</div>
    </div>
    <div class="progress-text">${percent}%</div>
  </td>
  <td>
  <span class="badge mobile-badge">CP${
    r.lastCPNum
  }</span><br class="mobile-break">
  ${r.CheckpointName}
</td>
`;
    tbody.appendChild(tr);
  });
}

function updateCheckpointStats(data) {
  const container = document.getElementById("checkpointStatsGrid");
  container.innerHTML = "";

  const counts = Array(27).fill(0);
  data.forEach((r) => {
    for (let i = 1; i <= 27; i++) {
      if (r["CP" + i]) counts[i - 1]++;
    }
  });

  for (let i = 1; i <= 27; i++) {
    const div = document.createElement("div");
    div.className = "cp-item";
    div.innerHTML = `
            <div class="cp-label">CP${i}</div>
            <div class="cp-value">${counts[i - 1]}</div>
          `;
    container.appendChild(div);
  }
}

function updateCheckpointRiders(data) {
  const container = document.getElementById("checkpointRidersContainer");
  container.innerHTML = "";

  const cpMap = {};

  data.forEach((r) => {
    let lastCP = 0;
    let name = "";
    for (let i = 27; i >= 1; i--) {
      if (r["CP" + i]) {
        lastCP = i;
        name = r.CheckpointName || "";
        break;
      }
    }

    if (!lastCP) return;

    if (!cpMap[lastCP]) cpMap[lastCP] = { name, riders: [] };
    const iso = r["CP" + lastCP];
    const timeObj = new Date(iso);
    const timeFormatted = timeObj.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    cpMap[lastCP].riders.push({
      number: r.ERZ_Number,
      name: r.DisplayNameERZ,
      lastCPTime: timeFormatted,
      nation: r.Nation || "N/A",
      bike: r.Bike || "Unknown",
    });
  });

  // Sort CPs descending
  const sortedCPs = Object.keys(cpMap).sort((a, b) => b - a);

  sortedCPs.forEach((cpNum) => {
    const { name, riders } = cpMap[cpNum];
    const section = document.createElement("div");
    section.style.marginBottom = "20px";

    const title = document.createElement("h3");
    title.style.textAlign = "center";
    title.textContent = `CP${cpNum} - ${name} (Count: ${riders.length})`;
    section.appendChild(title);

    const gridWrapper = document.createElement("div");
    gridWrapper.className = "responsive-cp-grid-wrapper";

    const grid = document.createElement("div");
    grid.className = "responsive-cp-grid";

    riders.forEach((rider) => {
      const { number, name, lastCPTime, nation, bike } = rider;

      const item = document.createElement("div");
      item.className = "cp-item";
      item.innerHTML = `
    <div class="cp-label-rider">RIDER</div>
    <div class="cp-value">${number}</div>
  `;

      const tooltip = document.getElementById("riderTooltip");

      const nationText =
        nation && nation !== "N/A" ? ` &middot; ${nation}` : "";

      // Desktop hover
      item.addEventListener("mouseenter", (e) => {
        if (window.matchMedia("(hover: hover)").matches) {
          tooltip.innerHTML = `
        <strong>${name}${nationText}</strong><br>
        Time at CP: ${lastCPTime}<br>
        ${bike}
      `;
          tooltip.style.opacity = "1";
          tooltip.style.left = e.pageX + 10 + "px";
          tooltip.style.top = e.pageY + 10 + "px";
        }
      });

      item.addEventListener("mousemove", (e) => {
        if (window.matchMedia("(hover: hover)").matches) {
          tooltip.style.left = e.pageX + 10 + "px";
          tooltip.style.top = e.pageY + 10 + "px";
        }
      });

      item.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
      });

      // Mobile tap support
      item.addEventListener("click", (e) => {
        if (!window.matchMedia("(hover: hover)").matches) {
          e.stopPropagation();
          tooltip.innerHTML = `
        <strong>${name}${nationText}</strong><br>
        Time at CP: ${lastCPTime}<br>
        ${bike}
      `;
          tooltip.style.opacity = "1";
          tooltip.style.left = e.pageX + 10 + "px";
          tooltip.style.top = e.pageY + 10 + "px";
        }
      });

      document.addEventListener("click", () => {
        if (!window.matchMedia("(hover: hover)").matches) {
          tooltip.style.opacity = "0";
        }
      });

      grid.appendChild(item);
    });

    gridWrapper.appendChild(grid);
    section.appendChild(gridWrapper);
    container.appendChild(section);
  });
}

async function loadDashboard() {
  const data = await fetchData();
  updateLeaderboard(data);
  updateCheckpointStats(data);
  updateCheckpointRiders(data);
}

loadDashboard();
const refreshBtn = document.getElementById("refreshBtn");
const refreshSpinner = document.getElementById("refreshSpinner");

let refreshTimeout;
let lastManualRefreshTime = 0;
const MIN_INTERVAL = 1000; // ms

async function periodicUpdate() {
  await loadDashboard();
  refreshTimeout = setTimeout(periodicUpdate, 3000); // 5s interval
}

async function manualRefresh() {
  const now = Date.now();
  if (now - lastManualRefreshTime < MIN_INTERVAL) return;

  lastManualRefreshTime = now;

  // Show spinner and disable button
  refreshSpinner.style.visibility = "visible";
  refreshBtn.disabled = true;

  clearTimeout(refreshTimeout);
  await loadDashboard();

  // Restart the periodic update (which schedules the next update)
  periodicUpdate();

  // Hide spinner and re-enable button
  refreshSpinner.style.visibility = "hidden";
  refreshBtn.disabled = false;
}

refreshBtn.addEventListener("click", manualRefresh);

periodicUpdate();
