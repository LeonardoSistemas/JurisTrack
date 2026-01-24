const API_BASE = "/api/config/eventos";
const AUTH_TOKEN_KEY = "juristrack_token";

const state = {
  eventos: [],
};

const els = {
  tabelaBody: document.getElementById("tabelaEventosBody"),
  busca: document.getElementById("buscaInput"),
  filtroStatus: document.getElementById("filtroStatus"),
  btnBuscar: document.getElementById("btnBuscar"),
  btnNovo: document.getElementById("btnNovoEvento"),
  alertArea: document.getElementById("alertArea"),
  modalEl: document.getElementById("modalEvento"),
  modalTitle: document.getElementById("modalEventoTitle"),
  eventoId: document.getElementById("eventoId"),
  nomeInput: document.getElementById("nomeInput"),
  descricaoInput: document.getElementById("descricaoInput"),
  ativoInput: document.getElementById("ativoInput"),
  salvarBtn: document.getElementById("salvarEventoBtn"),
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
  carregarEventos();
});

function bindEvents() {
  els.btnBuscar?.addEventListener("click", carregarEventos);
  els.btnNovo?.addEventListener("click", abrirModalCriar);
  els.salvarBtn?.addEventListener("click", salvarEvento);

  els.filtroStatus?.addEventListener("change", carregarEventos);
  els.busca?.addEventListener("keyup", (event) => {
    if (event.key === "Enter") carregarEventos();
  });

  els.tabelaBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const id = actionBtn.dataset.id;
    const evento = state.eventos.find((item) => String(item.id) === String(id));
    if (!evento) return;
    if (actionBtn.dataset.action === "edit") {
      abrirModalEditar(evento);
    }
  });
}

function setTableMessage(text) {
  if (!els.tabelaBody) return;
  els.tabelaBody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center text-muted py-4">${text}</td>
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

async function carregarEventos() {
  setTableMessage("Carregando eventos...");
  showAlert("info", "Buscando eventos...");

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
      throw new Error(data?.error || "Erro ao listar eventos.");
    }

    state.eventos = Array.isArray(data) ? data : [];
    renderTable();
    showAlert("success", `Lista atualizada (${state.eventos.length})`);
  } catch (error) {
    console.error("[eventos] erro ao carregar", error);
    state.eventos = [];
    renderTable();
    showAlert("danger", error.message);
  }
}

function renderTable() {
  if (!els.tabelaBody) return;

  if (!state.eventos.length) {
    setTableMessage("Nenhum evento encontrado com os filtros atuais.");
    return;
  }

  els.tabelaBody.innerHTML = state.eventos
    .map((evento) => {
      const statusLabel = evento.ativo ? "Ativo" : "Inativo";
      const badgeClass = evento.ativo ? "bg-success" : "bg-danger";

      return `
        <tr>
          <td>${evento.nome || "-"}</td>
          <td>${evento.descricao || "-"}</td>
          <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${evento.id}">
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
  els.modalTitle.textContent = "Novo Evento";
  els.eventoId.value = "";
  els.nomeInput.value = "";
  els.descricaoInput.value = "";
  els.ativoInput.checked = true;
  new bootstrap.Modal(els.modalEl).show();
}

function abrirModalEditar(evento) {
  if (!els.modalEl) return;
  els.modalTitle.textContent = "Editar Evento";
  els.eventoId.value = evento.id;
  els.nomeInput.value = evento.nome || "";
  els.descricaoInput.value = evento.descricao || "";
  els.ativoInput.checked = Boolean(evento.ativo);
  new bootstrap.Modal(els.modalEl).show();
}

async function salvarEvento() {
  const id = (els.eventoId?.value || "").trim();
  const nome = (els.nomeInput?.value || "").trim();
  const descricao = (els.descricaoInput?.value || "").trim();
  const ativo = els.ativoInput?.checked ?? true;

  if (!nome) {
    showAlert("warning", "Nome do evento é obrigatório.");
    return;
  }

  const payload = {
    nome,
    descricao: descricao || null,
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
      throw new Error(data?.error || "Erro ao salvar evento.");
    }

    bootstrap.Modal.getInstance(els.modalEl)?.hide();
    showAlert("success", "Evento salvo com sucesso.");
    carregarEventos();
  } catch (error) {
    console.error("[eventos] erro ao salvar", error);
    showAlert("danger", error.message);
  }
}
