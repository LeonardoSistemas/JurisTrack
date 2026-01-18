import {
  STATUS_META,
  buildStatusCardsData,
  extractMetricsFromHeaders,
  formatDateIso,
  formatSimilarity,
  sanitizePayload,
} from "./similaridade-core.js";
import { abrirModalAnalise, setAnaliseItens } from "./analisePublicacao.js";

const AUTH_TOKEN_KEY = "juristrack_token";
const UPLOAD_ID_KEY = "similaridade_upload_id";
const TOAST_CONTAINER_ID = "app-toast-container";

const state = {
  results: [],
  cards: [],
  grouped: {},
  metrics: null,
  uploadId: null,
  pendentes: [],
};

function ensureToastContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = TOAST_CONTAINER_ID;
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, variant = "info") {
  if (!message || !window.bootstrap?.Toast) return;
  const container = ensureToastContainer();
  const toastElement = document.createElement("div");
  toastElement.className = `toast align-items-center text-bg-${variant} border-0`;
  toastElement.role = "alert";
  toastElement.ariaLive = "assertive";
  toastElement.ariaAtomic = "true";
  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>
  `;

  container.appendChild(toastElement);
  const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
  toast.show();
  toastElement.addEventListener("hidden.bs.toast", () => toastElement.remove());
}

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

function resolveUploadId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("uploadId");
  if (fromQuery) return fromQuery;

  const persisted = sessionStorage.getItem(UPLOAD_ID_KEY);
  if (persisted) return persisted;

  if (window.__SIMILARIDADE_UPLOAD_ID__) return window.__SIMILARIDADE_UPLOAD_ID__;
  return null;
}

function persistUploadId(uploadId) {
  if (!uploadId) return;
  state.uploadId = uploadId;
  try {
    sessionStorage.setItem(UPLOAD_ID_KEY, uploadId);
  } catch {
    // falha ao persistir não deve quebrar o fluxo
  }
}

async function authFetch(url, options = {}) {
  const headers = getAuthHeaders();
  if (!headers) {
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }

  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers: mergedHeaders });
  return response;
}

function setFeedback(message, variant = "info") {
  const el = document.getElementById("similaridade-feedback");
  if (!el) return;

  if (!message) {
    el.classList.add("d-none");
    el.textContent = "";
    return;
  }

  el.className = `alert alert-${variant}`;
  el.textContent = message;
}

function setLoading(isLoading) {
  const btn = document.getElementById("btn-similaridade");
  const spinner = document.getElementById("loading-indicator");
  const processingBadge = document.getElementById("processing-badge");

  if (btn) btn.disabled = isLoading;
  if (spinner) spinner.classList.toggle("d-none", !isLoading);
  if (processingBadge) processingBadge.classList.toggle("d-none", !isLoading);
}

function renderMetrics(metrics) {
  const el = document.getElementById("metrics");
  if (!el) return;

  if (!metrics) {
    el.textContent = "Sem métricas do backend.";
    return;
  }

  const { processingTimeMs, itemsProcessed } = metrics;
  const seconds = processingTimeMs ? (processingTimeMs / 1000).toFixed(2) : "0";
  el.textContent = `Tempo: ${seconds}s • Itens processados: ${itemsProcessed || state.results.length
    }`;
}

function renderEmptyState() {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-secondary mb-0" role="alert">
        Nenhum resultado disponível. Envie o payload para ver os cartões por status.
      </div>
    </div>
  `;
}

function renderConciliacaoEmptyState(message) {
  const container = document.getElementById("cards-container");
  if (!container) return;
  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-secondary mb-0" role="alert">
        ${message || "Nenhum item pendente para conciliação."}
      </div>
    </div>
  `;
}

function toggleCardProcessing(cardEl, action, isProcessing) {
  if (!cardEl) return;
  const statusEl = cardEl.querySelector(".conciliacao-status");
  const buttons = cardEl.querySelectorAll("button[data-action]");

  buttons.forEach((btn) => {
    btn.disabled = isProcessing;
  });

  if (statusEl) {
    if (isProcessing) {
      statusEl.textContent =
        action === "cadastrar"
          ? "Processando cadastro..."
          : "Processando cancelamento...";
      statusEl.classList.remove("d-none");
    } else {
      statusEl.textContent = "";
      statusEl.classList.add("d-none");
    }
  }

  cardEl.classList.toggle("card-processing", Boolean(isProcessing));
}

function findCardByItemId(itemId) {
  return document.querySelector(`[data-item-id="${itemId}"]`);
}

function animateCardRemoval(itemId) {
  const cardEl = findCardByItemId(itemId);
  if (!cardEl) {
    renderConciliacaoCards(state.pendentes);
    return;
  }

  cardEl.classList.add("removing");
  setTimeout(() => {
    renderConciliacaoCards(state.pendentes);
  }, 180);
}

function renderConciliacaoCards(items) {
  const container = document.getElementById("cards-container");
  if (!container) return;

  if (!items || items.length === 0) {
    renderConciliacaoEmptyState();
    return;
  }

  container.innerHTML = "";

  const resolveScoreBadge = (score) => {
    const numeric = Number(score);
    const normalized = Number.isFinite(numeric)
      ? numeric > 1
        ? numeric
        : numeric * 100
      : null;

    if (!Number.isFinite(normalized) || normalized <= 0) {
      return "bg-primary-subtle text-primary";
    }

    return "bg-danger-subtle text-danger";
  };

  items.forEach((item) => {
    const col = document.createElement("div");
    col.className = "col-12";
    const similaridadeScore = formatSimilarity(item.similaridade_score);
    const processo = item.numero_processo || "Processo sem número";
    const dataPublicacao = formatDateIso(item.data_publicacao);
    const dataVencimento = formatDateIso(item.data_vencimento);
    const prazoDias = item.prazo_dias ?? "--";
    const tipoAndamento = item.tipo_andamento || item.dados_originais?.tipo_andamento || "--";
    const texto =
      item.texto_publicacao || item.texto || item.dados_originais?.texto || "--";
    const statusRaw = item.status || item.status_verificacao;
    const status = STATUS_META[statusRaw] ? statusRaw : "NOVO";
    const statusMeta = STATUS_META[status];
    const scoreBadgeClass = resolveScoreBadge(item.similaridade_score);
    const borderColor =
      statusMeta.variant === "primary"
        ? "var(--bs-primary)"
        : statusMeta.variant === "danger"
          ? "var(--bs-danger)"
          : statusMeta.variant === "warning"
            ? "var(--bs-warning)"
            : "var(--bs-secondary)";

    col.innerHTML = `
      <div
        class="card h-100 conciliacao-card status-${statusMeta.variant}"
        data-item-id="${item.id}"
        style="border-left:4px solid ${borderColor};"
      >
        <div class="card-body d-flex flex-column gap-3">
          <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div class="d-flex flex-column gap-1">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="badge bg-${statusMeta.variant}-subtle text-${statusMeta.variant}">
                  ${statusMeta.label}
                </span>
                <span class="text-muted small">${statusMeta.description || ""}</span>
              </div>
              <div class="mt-1">
                <span class="fw-bold fs-5 text-dark">${tipoAndamento}</span>
              </div>
              <div>
                <p class="text-muted small mb-1">Processo</p>
                <h6 class="mb-0">${processo}</h6>
              </div>
            </div>
            <span class="badge ${scoreBadgeClass}">
              Score ${similaridadeScore}
            </span>
          </div>

          <div>
            <details class="border rounded p-2 bg-light">
              <summary class="fw-semibold cursor-pointer" style="cursor: pointer;">
                <i class="fas fa-align-left me-2"></i>Texto da Publicação
              </summary>
              <div class="mt-3 p-2 bg-white border rounded" style="max-height:500px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;">${texto}</div>
            </details>
          </div>

          <div class="d-flex flex-wrap gap-3 small text-muted">
            <span><i class="fas fa-calendar-day me-1"></i>Publicação: ${dataPublicacao}</span>
            <span><i class="fas fa-hourglass-half me-1"></i>Prazo: ${prazoDias} dia(s)</span>
            <span><i class="fas fa-calendar-check me-1"></i>Vencimento: ${dataVencimento}</span>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm btn-analise" data-id="${item.id}">
              <i class="fas fa-magnifying-glass me-1"></i> Analisar
            </button>
            <button class="btn btn-success btn-sm" data-action="cadastrar" data-id="${item.id}">
              <i class="fas fa-check me-1"></i> Cadastrar
            </button>
            <button class="btn btn-outline-danger btn-sm" data-action="cancelar" data-id="${item.id}">
              <i class="fas fa-ban me-1"></i> Cancelar
            </button>
          </div>
          <div class="conciliacao-status text-muted small d-none" aria-live="polite"></div>
        </div>
      </div>
    `;

    container.appendChild(col);
  });

  container.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const action = e.currentTarget.dataset.action;
      const itemId = e.currentTarget.dataset.id;
      handleConciliacaoAction(action, itemId, e.currentTarget);
    });
  });

  container.querySelectorAll(".btn-analise").forEach((btn) => {
    btn.addEventListener("click", () => {
      const itemId = btn.dataset.id;
      const item = state.pendentes.find((entry) => entry.id === itemId);
      if (item) abrirModalAnalise(item);
    });
  });
}

function renderCards(cards) {
  const container = document.getElementById("cards-container");
  if (!container) return;

  if (!cards || cards.length === 0) {
    renderEmptyState();
    return;
  }

  container.innerHTML = "";

  cards.forEach(({ status, label, variant, description, count }) => {
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-lg-3";
    col.innerHTML = `
      <div class="card status-card border-${variant}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <p class="text-muted small mb-1">${label}</p>
              <h3 class="mb-0">${count}</h3>
            </div>
            <span class="badge bg-${variant}-subtle text-${variant} text-uppercase">${status}</span>
          </div>
          <p class="text-muted small mb-3">${description || ""}</p>
          <div class="d-grid">
            <button class="btn btn-outline-${variant} btn-sm" data-status="${status}">
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(col);
  });

  container
    .querySelectorAll("button[data-status]")
    .forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const status = e.currentTarget.dataset.status;
        renderModal(status);
      })
    );
}

function renderModal(status) {
  const modalElement = document.getElementById("statusModal");
  const modalTitle = document.getElementById("statusModalLabel");
  const modalBody = document.getElementById("statusModalBody");

  if (!modalElement || !modalTitle || !modalBody) return;

  const items = state.grouped[status] || [];
  const meta = STATUS_META[status] || STATUS_META.DESCONHECIDO;

  modalTitle.textContent = `${meta.label} (${items.length})`;
  modalBody.innerHTML = "";

  if (!items.length) {
    modalBody.innerHTML = `<p class="text-muted mb-0">Sem itens para este status.</p>`;
  } else {
    const rows = items
      .map(
        (item) => `
        <div class="mb-3 border-bottom pb-2">
          <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <div>
              <p class="mb-1 fw-semibold">${item.numero_processo || "Processo sem número"}</p>
              <p class="mb-0 text-muted small">${formatDateIso(item.data_publicacao)}</p>
            </div>
            <span class="badge bg-${meta.variant}">${formatSimilarity(item.similarity)}</span>
          </div>
          <div class="mt-2">
            <details class="border rounded p-2 bg-light">
              <summary class="fw-semibold cursor-pointer" style="cursor: pointer; font-size: 0.85rem;">
                <i class="fas fa-align-left me-2"></i>Texto da Publicação
              </summary>
              <div class="mt-2 p-2 bg-white border rounded" style="max-height:300px; overflow-y:auto; white-space:pre-wrap; word-break:break-word; font-size: 0.9rem;">${item.texto || "--"}</div>
            </details>
          </div>
        </div>
      `
      )
      .join("");

    modalBody.innerHTML = rows;
  }

  const instance = bootstrap.Modal.getOrCreateInstance(modalElement);
  instance.show();
}

function persistPayload(payload) {
  try {
    sessionStorage.setItem(
      "similaridade_payload",
      JSON.stringify(payload || [])
    );
  } catch (err) {
    console.warn("Não foi possível salvar payload em sessionStorage", err);
  }
}

function readPersistedPayload() {
  try {
    const saved = sessionStorage.getItem("similaridade_payload");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function readPayloadFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("payload");
  if (!encoded) return null;

  try {
    const decoded = decodeURIComponent(encoded);
    return JSON.parse(decoded);
  } catch (err) {
    console.warn("Falha ao decodificar payload da URL", err);
    return null;
  }
}

function getPayloadFromTextArea() {
  const textarea = document.getElementById("payload-input");
  if (!textarea) return null;
  const value = textarea.value?.trim();
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    throw new Error("JSON inválido no campo de payload");
  }
}

function resolvePayload() {
  return (
    window.__SIMILARIDADE_PAYLOAD__ ||
    readPayloadFromQuery() ||
    readPersistedPayload() ||
    getPayloadFromTextArea()
  );
}

function updateTextArea(payload) {
  const textarea = document.getElementById("payload-input");
  if (textarea && payload) {
    textarea.value = JSON.stringify(payload, null, 2);
  }
}

function setSourceInfo(text) {
  const el = document.getElementById("similaridade-source");
  if (!el) return;
  el.textContent = text || "";
}

async function carregarPendentes(uploadId) {
  if (!uploadId) {
    renderConciliacaoEmptyState("Nenhum upload selecionado.");
    return;
  }

  setFeedback(null);
  setLoading(true);

  try {
    const response = await authFetch(`/api/similaridade/itens/${uploadId}`);
    const body = await response.json().catch(() => []);

    if (!response.ok) {
      setFeedback(body?.error || "Falha ao carregar itens pendentes.", "danger");
      showToast(body?.error || "Falha ao carregar itens pendentes.", "danger");
      renderConciliacaoEmptyState();
      return;
    }

    state.pendentes = Array.isArray(body) ? body : [];
    setAnaliseItens(state.pendentes);
    if (state.pendentes.length === 0) {
      setFeedback("Nenhum item pendente para este upload.", "info");
    } else {
      setFeedback(`Itens pendentes carregados para o upload ${uploadId}.`, "success");
      showToast(`Itens pendentes carregados para o upload ${uploadId}.`, "success");
    }
    renderConciliacaoCards(state.pendentes);
  } catch (error) {
    console.error(error);
    setFeedback("Erro inesperado ao buscar itens pendentes.", "danger");
    showToast("Erro inesperado ao buscar itens pendentes.", "danger");
    renderConciliacaoEmptyState();
  } finally {
    setLoading(false);
  }
}

async function handleConciliacaoAction(action, itemId, button) {
  if (!itemId || !action) return;

  const endpoints = {
    cadastrar: "/api/similaridade/conciliar/cadastrar",
    cancelar: "/api/similaridade/conciliar/cancelar",
  };

  const url = endpoints[action];
  if (!url) return;

  const originalText = button?.innerHTML;
  const cardEl = button?.closest(".conciliacao-card");

  toggleCardProcessing(cardEl, action, true);
  if (button) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span>${action === "cadastrar" ? "Cadastrando..." : "Cancelando..."}`;
  }

  let actionSucceeded = false;
  try {
    const response = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(body?.error || "Falha ao conciliar item.", "danger");
      showToast(body?.error || "Falha ao conciliar item.", "danger");
      return;
    }

    actionSucceeded = true;
    state.pendentes = state.pendentes.filter((item) => item.id !== itemId);
    setAnaliseItens(state.pendentes);
    animateCardRemoval(itemId);

    const successMsg =
      body?.message ||
      (action === "cadastrar" ? "Item cadastrado com sucesso." : "Item cancelado com sucesso.");
    setFeedback(successMsg, "success");
    showToast(successMsg, "success");
  } catch (err) {
    console.error(err);
    setFeedback("Erro inesperado ao conciliar item.", "danger");
    showToast("Erro inesperado ao conciliar item.", "danger");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
    if (!actionSucceeded && cardEl) {
      toggleCardProcessing(cardEl, action, false);
    }
  }
}

async function enviarSimilaridade(auto = false) {
  try {
    setFeedback(null);
    setLoading(true);

    const rawPayload = resolvePayload();
    if (!rawPayload) {
      throw new Error("Nenhum payload disponível. Aguarde o retorno do fluxo N8N ou uma sessão anterior.");
    }

    const sanitized = sanitizePayload(rawPayload);
    persistPayload(sanitized);
    updateTextArea(sanitized);

    const response = await authFetch("/api/publicacoes/similaridade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitized),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 503) {
        const retry = body?.retryAfterSeconds ?? body?.retryAfter;
        setFeedback(
          `Backend sinalizou sobrecarga (503). Tente novamente${retry ? ` em ~${retry}s` : ""
          }.`,
          "warning"
        );
      } else {
        setFeedback(body?.error || "Falha ao processar similaridade.", "danger");
      }
      return;
    }

    state.results = Array.isArray(body) ? body : [];
    state.cards = buildStatusCardsData(state.results);
    state.grouped = state.cards.reduce((acc, card) => {
      acc[card.status] = card.items;
      return acc;
    }, {});

    state.metrics = extractMetricsFromHeaders(response.headers);

    renderMetrics(state.metrics);
    renderCards(state.cards);
    const successMsg = auto
      ? "Similaridade processada automaticamente com payload do N8N."
      : "Resultados atualizados com sucesso.";
    setFeedback(successMsg, "success");
  } catch (err) {
    console.error(err);
    setFeedback(err.message || "Erro inesperado ao enviar similaridade.", "danger");
  } finally {
    setLoading(false);
  }
}

function attachHandlers() {
  const btn = document.getElementById("btn-similaridade");
  if (btn) btn.addEventListener("click", enviarSimilaridade);

  window.addEventListener("message", (event) => {
    if (event?.data?.type === "similaridadePayload" && event.data.payload) {
      const payload = event.data.payload;
      const autoSend = Boolean(event.data.autoSend);
      const source = event.data.source || "Payload recebido do fluxo N8N.";
      window.__SIMILARIDADE_PAYLOAD__ = payload;
      updateTextArea(payload);
      setSourceInfo(source);
      if (autoSend) {
        enviarSimilaridade(true);
      } else {
        setFeedback("Payload recebido. Clique em Processar Similaridade.", "info");
      }
    }

    if (event?.data?.type === "similaridadeUploadId" && event.data.uploadId) {
      const uploadId = event.data.uploadId;
      persistUploadId(uploadId);
      setSourceInfo(`Itens pendentes do upload ${uploadId}.`);
      carregarPendentes(uploadId);
    }
  });
}

function bootstrapPage() {
  setFeedback(null);
  attachHandlers();

  const uploadId = resolveUploadId();
  if (uploadId) {
    persistUploadId(uploadId);
    setSourceInfo(`Itens pendentes do upload ${uploadId}.`);
    carregarPendentes(uploadId);
    return;
  }

  renderEmptyState();

  const initialPayload =
    window.__SIMILARIDADE_PAYLOAD__ ||
    readPayloadFromQuery() ||
    readPersistedPayload();

  if (initialPayload) {
    updateTextArea(initialPayload);
    setSourceInfo("Payload carregado da sessão anterior.");
    // Envia automaticamente se o payload veio da sessão anterior
    enviarSimilaridade(true);
  }
}

document.addEventListener("analise:item-processed", (event) => {
  const itemId = event?.detail?.itemId;
  if (!itemId) return;
  state.pendentes = state.pendentes.filter((item) => item.id !== itemId);
  setAnaliseItens(state.pendentes);
  renderConciliacaoCards(state.pendentes);
});

document.addEventListener("DOMContentLoaded", bootstrapPage);

