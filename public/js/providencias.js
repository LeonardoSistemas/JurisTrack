const API_BASE = "/api/config/providencias";
const AUTH_TOKEN_KEY = "juristrack_token";

const state = {
  providencias: [],
};

const els = {
  tabelaBody: document.getElementById("tabelaProvidenciasBody"),
  busca: document.getElementById("buscaInput"),
  filtroStatus: document.getElementById("filtroStatus"),
  btnBuscar: document.getElementById("btnBuscar"),
  btnNovo: document.getElementById("btnNovaProvidencia"),
  alertArea: document.getElementById("alertArea"),
  modalEl: document.getElementById("modalProvidencia"),
  modalTitle: document.getElementById("modalProvidenciaTitle"),
  providenciaId: document.getElementById("providenciaId"),
  nomeInput: document.getElementById("nomeInput"),
  descricaoInput: document.getElementById("descricaoInput"),
  exigePeticaoInput: document.getElementById("exigePeticaoInput"),
  ativoInput: document.getElementById("ativoInput"),
  salvarBtn: document.getElementById("salvarProvidenciaBtn"),
};

function authFetch(url, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    window.location.href = "/login";
    return Promise.reject(new Error("Token ausente"));
  }
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  return fetch(url, { ...options, headers });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  carregarProvidencias();
});

function bindEvents() {
  els.btnBuscar?.addEventListener("click", carregarProvidencias);
  els.btnNovo?.addEventListener("click", abrirModalCriar);
  els.salvarBtn?.addEventListener("click", salvarProvidencia);

  els.filtroStatus?.addEventListener("change", carregarProvidencias);
  els.busca?.addEventListener("keyup", (event) => {
    if (event.key === "Enter") carregarProvidencias();
  });

  els.tabelaBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const id = actionBtn.dataset.id;
    const providencia = state.providencias.find((item) => String(item.id) === String(id));
    if (!providencia) return;
    if (actionBtn.dataset.action === "edit") {
      abrirModalEditar(providencia);
    }
  });
}

function setTableMessage(text) {
  if (!els.tabelaBody) return;
  els.tabelaBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-4">${text}</td>
    </tr>
  `;
}

function showAlert(type, message) {
  if (!els.alertArea) return;
  if (!message) {
    els.alertArea.innerHTML = "";
    return;
  }
  els.alertArea.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

async function carregarProvidencias() {
  setTableMessage("Carregando providências...");
  showAlert("info", "Buscando providências...");

  const params = new URLSearchParams();
  const busca = (els.busca?.value || "").trim();
  const status = els.filtroStatus?.value;
  if (busca) params.set("busca", busca);
  if (status && status !== "todos") params.set("status", status);

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;

  try {
    const response = await authFetch(url);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar providências.");
    }

    state.providencias = Array.isArray(data) ? data : [];
    renderTable();
    showAlert("success", `Lista atualizada (${state.providencias.length})`);
  } catch (error) {
    console.error("[providencias] erro ao carregar", error);
    state.providencias = [];
    renderTable();
    showAlert("danger", error.message);
  }
}

function renderTable() {
  if (!els.tabelaBody) return;

  if (!state.providencias.length) {
    setTableMessage("Nenhuma providência encontrada com os filtros atuais.");
    return;
  }

  els.tabelaBody.innerHTML = state.providencias
    .map((providencia) => {
      const statusLabel = providencia.ativo ? "Ativo" : "Inativo";
      const statusClass = providencia.ativo ? "bg-success" : "bg-danger";
      const peticaoLabel = providencia.exige_peticao ? "Sim" : "Não";
      const peticaoClass = providencia.exige_peticao ? "bg-info" : "bg-secondary";

      return `
        <tr>
          <td>${providencia.nome || "-"}</td>
          <td>${providencia.descricao || "-"}</td>
          <td><span class="badge ${peticaoClass}">${peticaoLabel}</span></td>
          <td><span class="badge ${statusClass}">${statusLabel}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${providencia.id}">
              <i class="fas fa-pen"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function abrirModalCriar() {
  if (!els.modalEl) return;
  els.modalTitle.textContent = "Nova Providência";
  els.providenciaId.value = "";
  els.nomeInput.value = "";
  els.descricaoInput.value = "";
  els.exigePeticaoInput.checked = false;
  els.ativoInput.checked = true;
  new bootstrap.Modal(els.modalEl).show();
}

function abrirModalEditar(providencia) {
  if (!els.modalEl) return;
  els.modalTitle.textContent = "Editar Providência";
  els.providenciaId.value = providencia.id;
  els.nomeInput.value = providencia.nome || "";
  els.descricaoInput.value = providencia.descricao || "";
  els.exigePeticaoInput.checked = Boolean(providencia.exige_peticao);
  els.ativoInput.checked = Boolean(providencia.ativo);
  new bootstrap.Modal(els.modalEl).show();
}

async function salvarProvidencia() {
  const id = (els.providenciaId?.value || "").trim();
  const nome = (els.nomeInput?.value || "").trim();
  const descricao = (els.descricaoInput?.value || "").trim();
  const exigePeticao = els.exigePeticaoInput?.checked ?? false;
  const ativo = els.ativoInput?.checked ?? true;

  if (!nome) {
    showAlert("warning", "Nome da providência é obrigatório.");
    return;
  }

  const payload = {
    nome,
    descricao: descricao || null,
    exige_peticao: exigePeticao,
    ativo,
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_BASE}/${id}` : API_BASE;

  try {
    const response = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao salvar providência.");
    }

    bootstrap.Modal.getInstance(els.modalEl)?.hide();
    showAlert("success", "Providência salva com sucesso.");
    carregarProvidencias();
  } catch (error) {
    console.error("[providencias] erro ao salvar", error);
    showAlert("danger", error.message);
  }
}
