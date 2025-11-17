// グローバル変数
let rawData = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 25;
let charts = {};
let allYears = [];
let tonnageCategories = [];

// CSVファイルの読み込み
document.getElementById("csvFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file, "shift_jis");

  document.getElementById("uploadStatus").innerHTML =
    '<span style="color: #48bb78;">読み込み中...</span>';
});

// CSVパース関数
function parseCSV(text) {
  const lines = text.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  // トン数カテゴリーを抽出（ヘッダーから）
  tonnageCategories = [];
  const yearIndex = 0;
  for (let i = 1; i < headers.length; i++) {
    tonnageCategories.push(headers[i]);
  }

  rawData = [];
  allYears = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    if (values.length >= 2 && values[0]) {
      const year = parseInt(values[0]);
      allYears.push(year);

      // 各トン数カテゴリーのデータを行として追加
      for (let j = 1; j < values.length; j++) {
        const category = headers[j];
        const shipCount = parseInt(values[j]) || 0;

        if (category && shipCount > 0) {
          rawData.push({
            year: year,
            tonnage: category,
            shipCount: shipCount,
          });
        }
      }
    }
  }

  // 年度を重複なく昇順にソート
  allYears = [...new Set(allYears)].sort((a, b) => a - b);
  filteredData = [...rawData];

  if (rawData.length > 0) {
    document.getElementById(
      "uploadStatus"
    ).innerHTML = `<span style="color: #48bb78;">✓ ${allYears.length}年度のデータを読み込みました</span>`;
    updateDashboard();
  } else {
    document.getElementById("uploadStatus").innerHTML =
      '<span style="color: #f56565;">データの読み込みに失敗しました</span>';
  }
}

// ダッシュボード更新
function updateDashboard() {
  // セクション表示
  document.getElementById("summarySection").classList.remove("hidden");
  document.getElementById("chartsSection").classList.remove("hidden");
  document.getElementById("distributionSection").classList.remove("hidden");
  document.getElementById("tableSection").classList.remove("hidden");

  // サマリーカード更新
  updateSummaryCards();

  // チャート更新
  updateCharts();

  // テーブル更新
  updateTable();
}

// サマリーカード更新
function updateSummaryCards() {
  // 総入港数（すべてのデータの合計）
  const totalShips = rawData.reduce((sum, d) => sum + d.shipCount, 0);
  document.getElementById("totalShips").textContent = totalShips.toLocaleString();

  // 年度データ数
  document.getElementById("yearCount").textContent = allYears.length;

  // 平均年間入港数
  const avgShips = Math.round(totalShips / allYears.length);
  document.getElementById("avgShips").textContent = avgShips.toLocaleString();

  // 最高年入港数
  const yearlyTotals = {};
  rawData.forEach((d) => {
    if (!yearlyTotals[d.year]) {
      yearlyTotals[d.year] = 0;
    }
    yearlyTotals[d.year] += d.shipCount;
  });
  const maxShips = Math.max(...Object.values(yearlyTotals));
  document.getElementById("maxShips").textContent = maxShips.toLocaleString();
}

// チャート更新
function updateCharts() {
  updateTrendChart();
  updateLatestYearChart();
  updateStackedChart();
}

// トン数別入港数の推移グラフ
function updateTrendChart() {
  // 各トン数カテゴリーについて、年度ごとの入港数を集計
  const datasets = [];
  const colors = [
    "rgba(102, 126, 234, 0.8)",
    "rgba(246, 173, 85, 0.8)",
    "rgba(72, 187, 120, 0.8)",
    "rgba(245, 101, 101, 0.8)",
    "rgba(171, 102, 205, 0.8)",
    "rgba(237, 137, 54, 0.8)",
    "rgba(72, 187, 120, 0.8)",
    "rgba(66, 153, 225, 0.8)",
  ];

  tonnageCategories.forEach((category, index) => {
    const data = allYears.map((year) => {
      const record = rawData.find((d) => d.year === year && d.tonnage === category);
      return record ? record.shipCount : 0;
    });

    datasets.push({
      label: category,
      data: data,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length].replace("0.8", "0.1"),
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  });

  if (charts.trend) charts.trend.destroy();

  const ctx = document.getElementById("trendChart").getContext("2d");
  charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels: allYears.map((y) => y.toString()),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "top",
          maxHeight: 50,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

// 最新年度のトン数別入港数グラフ
function updateLatestYearChart() {
  const latestYear = allYears[allYears.length - 1];
  const latestData = rawData.filter((d) => d.year === latestYear);

  const labels = latestData.map((d) => d.tonnage);
  const data = latestData.map((d) => d.shipCount);

  if (charts.latestYear) charts.latestYear.destroy();

  const ctx = document.getElementById("latestYearChart").getContext("2d");
  charts.latestYear = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: latestYear.toString() + "年度",
          data: data,
          backgroundColor: "rgba(72, 187, 120, 0.8)",
          borderColor: "rgba(72, 187, 120, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

// 年度別トン数別入港数の推移（積み上げグラフ）
function updateStackedChart() {
  const datasets = [];
  const colors = [
    "rgba(102, 126, 234, 0.8)",
    "rgba(246, 173, 85, 0.8)",
    "rgba(72, 187, 120, 0.8)",
    "rgba(245, 101, 101, 0.8)",
    "rgba(171, 102, 205, 0.8)",
    "rgba(237, 137, 54, 0.8)",
    "rgba(66, 153, 225, 0.8)",
    "rgba(237, 137, 54, 0.8)",
  ];

  tonnageCategories.forEach((category, index) => {
    const data = allYears.map((year) => {
      const record = rawData.find((d) => d.year === year && d.tonnage === category);
      return record ? record.shipCount : 0;
    });

    datasets.push({
      label: category,
      data: data,
      backgroundColor: colors[index % colors.length],
      borderColor: colors[index % colors.length].replace("0.8", "1"),
      borderWidth: 0,
    });
  });

  if (charts.stacked) charts.stacked.destroy();

  const ctx = document.getElementById("stackedChart").getContext("2d");
  charts.stacked = new Chart(ctx, {
    type: "bar",
    data: {
      labels: allYears.map((y) => y.toString()),
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          maxHeight: 50,
        },
      },
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

// テーブル更新
function updateTable() {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageData = filteredData.slice(start, end);

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  pageData.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${row.year}</td>
            <td>${row.tonnage}</td>
            <td>${row.shipCount.toLocaleString()}</td>
        `;
    tbody.appendChild(tr);
  });

  updatePagination();
}

// ページネーション更新
function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  document.getElementById(
    "pageInfo"
  ).textContent = `${currentPage} / ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// 検索機能
document.getElementById("searchInput").addEventListener("input", function (e) {
  const searchTerm = e.target.value.toLowerCase();
  filteredData = rawData.filter((row) => {
    return Object.values(row).some((value) =>
      String(value).toLowerCase().includes(searchTerm)
    );
  });
  currentPage = 1;
  updateTable();
});

// ページあたりの表示件数変更
document
  .getElementById("itemsPerPage")
  .addEventListener("change", function (e) {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    updateTable();
  });

// ページネーションボタン
document.getElementById("prevPage").addEventListener("click", function () {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
  }
});

document.getElementById("nextPage").addEventListener("click", function () {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
  }
});
