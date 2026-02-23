// Dashboard JavaScript
const API_BASE = "/api";

// Chart instances
let genderChart, nationalityChart, ageChart, countryChart, timelineChart;

// Color palettes
const COLORS = {
  primary: ["#4f46e5", "#7c3aed", "#2563eb", "#0891b2", "#059669"],
  pastel: [
    "#93c5fd",
    "#c4b5fd",
    "#a5b4fc",
    "#99f6e4",
    "#86efac",
    "#fcd34d",
    "#fca5a5",
    "#f9a8d4",
  ],
  gradient: [
    "rgba(79, 70, 229, 0.8)",
    "rgba(124, 58, 237, 0.8)",
    "rgba(37, 99, 235, 0.8)",
    "rgba(8, 145, 178, 0.8)",
    "rgba(5, 150, 105, 0.8)",
  ],
};

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  setDefaultDateRange();
  loadDashboardData();
});

// Set default date range (1 month)
function setDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  document.getElementById("startDate").value = formatDate(startDate);
  document.getElementById("endDate").value = formatDate(endDate);
}

// Format date to YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// Apply date filter
function applyDateFilter() {
  loadDashboardData();
}

// Reset date filter
function resetDateFilter() {
  setDefaultDateRange();
  loadDashboardData();
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await fetch(`${API_BASE}/dashboard/stats?${params}`);
    const data = await response.json();

    if (response.ok) {
      updateStats(data);
      updateCharts(data);
    } else {
      console.error("Error loading dashboard:", data);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Update statistics cards
function updateStats(data) {
  document.getElementById("totalUsers").textContent = data.totalUsers || 0;

  const maleCount =
    data.genderDistribution?.find((g) => g.gender === "male")?.count || 0;
  const femaleCount =
    data.genderDistribution?.find((g) => g.gender === "female")?.count || 0;

  document.getElementById("maleCount").textContent = maleCount;
  document.getElementById("femaleCount").textContent = femaleCount;
  document.getElementById("countryCount").textContent =
    data.countryDistribution?.length || 0;
}

// Update all charts
function updateCharts(data) {
  updateGenderChart(data.genderDistribution);
  updateNationalityChart(data.nationalityDistribution);
  updateAgeChart(data.ageDistribution);
  updateCountryChart(data.countryDistribution);
  updateTimelineChart(data.registrationsPerDate);
}

// Gender Pie Chart
function updateGenderChart(genderData) {
  const ctx = document.getElementById("genderChart").getContext("2d");

  if (genderChart) {
    genderChart.destroy();
  }

  const labels =
    genderData?.map((g) => (g.gender === "male" ? "Laki-laki" : "Perempuan")) ||
    [];
  const values = genderData?.map((g) => g.count) || [];

  genderChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#3b82f6", "#ec4899"],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${context.raw} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Nationality Pie Chart
function updateNationalityChart(nationalityData) {
  const ctx = document.getElementById("nationalityChart").getContext("2d");

  if (nationalityChart) {
    nationalityChart.destroy();
  }

  const labels = nationalityData?.map((n) => n.nationality) || [];
  const values = nationalityData?.map((n) => n.count) || [];

  nationalityChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: COLORS.pastel,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${context.raw} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Age Distribution Bar Chart
function updateAgeChart(ageData) {
  const ctx = document.getElementById("ageChart").getContext("2d");

  if (ageChart) {
    ageChart.destroy();
  }

  const labels = ageData?.map((a) => a.age_group) || [];
  const values = ageData?.map((a) => a.count) || [];

  ageChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Jumlah User",
          data: values,
          backgroundColor: "rgba(79, 70, 229, 0.8)",
          borderColor: "rgba(79, 70, 229, 1)",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// Country Bar Chart
function updateCountryChart(countryData) {
  const ctx = document.getElementById("countryChart").getContext("2d");

  if (countryChart) {
    countryChart.destroy();
  }

  const labels = countryData?.map((c) => c.country) || [];
  const values = countryData?.map((c) => c.count) || [];

  countryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Jumlah User",
          data: values,
          backgroundColor: COLORS.gradient,
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// Timeline Column Chart
function updateTimelineChart(timelineData) {
  const ctx = document.getElementById("timelineChart").getContext("2d");

  if (timelineChart) {
    timelineChart.destroy();
  }

  const labels =
    timelineData?.map((t) => {
      const date = new Date(t.registered_date);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    }) || [];
  const values = timelineData?.map((t) => t.count) || [];

  timelineChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Registrasi",
          data: values,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: function (context) {
              const idx = context[0].dataIndex;
              return timelineData[idx]?.registered_date || "";
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
      },
    },
  });
}
