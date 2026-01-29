const charts = {
  situacao: null,
  fase: null,
  tribunais: null,
};

const AUTH_TOKEN_KEY = "juristrack_token";
const chartLoaders = {
  situacao: "loading-situacao",
  fase: "loading-fase",
  tribunais: "loading-tribunais",
};

const KPI_ELEMENT_IDS = [
  "kpi-total-processos",
  "kpi-valor-causa",
  "kpi-prazos-urgentes",
  "kpi-andamentos-recentes",
];

const palette = [
  "#2563eb",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
  "#8b5cf6",
  "#f472b6",
  "#10b981",
];

function cycleColors(length) {
  return Array.from({ length }, (_, index) => palette[index % palette.length]);
}

function formatCurrencyBRL(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(safeValue);
}

function formatDate(value) {
  if (!value) return "--";
  const rawValue = String(value);
  if (rawValue.includes("T")) {
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    return date.toLocaleDateString("pt-BR");
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function setKpisLoading(isLoading) {
  const placeholder = '<span class="placeholder-glow"><span class="placeholder col-8"></span></span>';

  KPI_ELEMENT_IDS.forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;

    if (isLoading) {
      element.dataset.loading = "true";
      element.innerHTML = placeholder;
    } else {
      if (element.dataset.loading) {
        delete element.dataset.loading;
      }

      if (element.querySelector(".placeholder")) {
        element.textContent = "--";
      }
    }
  });
}

function showFeedback(message, variant = "danger") {
  const feedback = document.getElementById("dashboard-feedback");
  if (!feedback) return;

  if (!message) {
    feedback.classList.add("d-none");
    feedback.textContent = "";
    return;
  }

  feedback.textContent = message;
  feedback.className = `alert alert-${variant} mb-3`;
}

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function ensureAuthenticated() {
  const headers = getAuthHeaders();
  if (!headers) {
    window.location.href = "/login";
    return null;
  }
  return headers;
}

async function fetchJson(url) {
  const headers = ensureAuthenticated();
  if (!headers) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const message = await response.text();
    if (response.status === 401) {
      window.location.href = "/login";
    }
    throw new Error(message || `Erro ao buscar ${url}`);
  }
  return response.json();
}

function updateKpis(summary) {
  const {
    totalProcessos,
    valorCausaTotal,
    prazosUrgentesCount,
    andamentosRecentesCount,
  } = summary || {};

  const map = {
    "kpi-total-processos": totalProcessos ?? "--",
    "kpi-valor-causa": valorCausaTotal != null ? formatCurrencyBRL(valorCausaTotal) : "--",
    "kpi-prazos-urgentes": prazosUrgentesCount ?? "--",
    "kpi-andamentos-recentes": andamentosRecentesCount ?? "--",
  };

  Object.entries(map).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value ?? "--";
    }
  });
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
}

function resetCharts() {
  Object.keys(charts).forEach(destroyChart);
}

function renderCharts(distribuicoes = {}) {
  const {
    distribuicaoSituacao = [],
    distribuicaoFase = [],
    topTribunais = [],
  } = distribuicoes;

  // Situação - Rosca
  const situacaoCtx = document.getElementById("chart-situacao");
  if (situacaoCtx) {
    destroyChart("situacao");
    const labels = distribuicaoSituacao.map((item) => item.label || "Não informado");
    const data = distribuicaoSituacao.map((item) => item.count || 0);
    charts.situacao = new Chart(situacaoCtx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: cycleColors(labels.length),
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: "bottom" },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
        },
        cutout: "60%",
      },
    });
  }

  // Fase - Barras verticais
  const faseCtx = document.getElementById("chart-fase");
  if (faseCtx) {
    destroyChart("fase");
    const labels = distribuicaoFase.map((item) => item.label || "Não informado");
    const data = distribuicaoFase.map((item) => item.count || 0);
    charts.fase = new Chart(faseCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Processos",
            data,
            backgroundColor: cycleColors(labels.length),
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} processos` } },
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } },
        },
      },
    });
  }

  // Tribunais - Barras horizontais
  const tribunaisCtx = document.getElementById("chart-tribunais");
  if (tribunaisCtx) {
    destroyChart("tribunais");
    const labels = topTribunais.map((item) => item.label || "Não informado");
    const data = topTribunais.map((item) => item.count || 0);
    charts.tribunais = new Chart(tribunaisCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Processos",
            data,
            backgroundColor: cycleColors(labels.length),
            borderRadius: 8,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x} processos` } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }
}

function renderTableRows(targetId, items, emptyMessage) {
  const tbody = document.getElementById(targetId);
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">${emptyMessage}</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => `
      <tr>
        <td>${item.numeroProcesso || "--"}</td>
        <td>${item.descricao || "--"}</td>
        <td>${item.data_limite ? formatDate(item.data_limite) : item.data_evento ? formatDate(item.data_evento) : "--"}</td>
      </tr>`
    )
    .join("");
}

function toggleChartLoading(key, isLoading) {
  const loaderId = chartLoaders[key];
  if (!loaderId) return;

  const loader = document.getElementById(loaderId);
  if (!loader) return;

  loader.classList.toggle("d-none", !isLoading);
  loader.setAttribute("aria-hidden", (!isLoading).toString());
}

function setChartsLoading(isLoading) {
  Object.keys(chartLoaders).forEach((key) => toggleChartLoading(key, isLoading));
}

async function carregarPrazos() {
  renderTableRows("tabela-prazos", null, "Carregando prazos...");
  try {
    const { items } = await fetchJson("/api/dashboard/prazos-detalhes");
    renderTableRows("tabela-prazos", items, "Nenhum prazo para os próximos 7 dias.");
  } catch (error) {
    renderTableRows("tabela-prazos", null, "Erro ao carregar prazos.");
  }
}

async function carregarAndamentos() {
  renderTableRows("tabela-andamentos", null, "Carregando andamentos...");
  try {
    const { items } = await fetchJson("/api/dashboard/andamentos-detalhes");
    renderTableRows("tabela-andamentos", items, "Nenhum andamento recente encontrado.");
  } catch (error) {
    renderTableRows("tabela-andamentos", null, "Erro ao carregar andamentos.");
  }
}

async function loadSummaryData() {
  setKpisLoading(true);
  showFeedback(null);
  setChartsLoading(true);

  if (!ensureAuthenticated()) {
    return;
  }

  try {
    const summary = await fetchJson("/api/dashboard/summary");
    updateKpis(summary);
    renderCharts(summary);
  } catch (error) {
    updateKpis({});
    resetCharts();
    showFeedback("Não foi possível carregar os dados do dashboard. Tente novamente.", "warning");
  } finally {
    setChartsLoading(false);
  }

  setKpisLoading(false);
}

function openPrazosModal() {
  const modalElement = document.getElementById("modalPrazos");
  if (!modalElement) return;
  renderTableRows("tabela-prazos", null, "Carregando prazos...");
  carregarPrazos();
  const instance = bootstrap.Modal.getOrCreateInstance(modalElement);
  instance.show();
}

function openAndamentosModal() {
  const modalElement = document.getElementById("modalAndamentos");
  if (!modalElement) return;
  renderTableRows("tabela-andamentos", null, "Carregando andamentos...");
  carregarAndamentos();
  const instance = bootstrap.Modal.getOrCreateInstance(modalElement);
  instance.show();
}

function setupCardListeners() {
  const prazosCard = document.querySelector('[data-bs-target="#modalPrazos"]');
  const andamentosCard = document.querySelector('[data-bs-target="#modalAndamentos"]');

  if (prazosCard) {
    prazosCard.addEventListener("click", (event) => {
      event.preventDefault();
      openPrazosModal();
    });
  }

  if (andamentosCard) {
    andamentosCard.addEventListener("click", (event) => {
      event.preventDefault();
      openAndamentosModal();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSummaryData();
  setupCardListeners();
});

