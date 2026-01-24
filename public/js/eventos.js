const API_BASE = "/api/config/eventos";
const MAPPING_API_BASE = "/api/config/eventos/mapeamentos";
const RULES_API_BASE = "/api/config/eventos/providencias";
const PROVIDENCIAS_API_BASE = "/api/config/providencias";
const AUTH_TOKEN_KEY = "juristrack_token";

const state = {
  eventos: [],
  eventosParaMapeamento: [],
  eventosParaRegras: [],
  mapeamentos: [],
  providencias: [],
  regras: [],
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
  mappingAlertArea: document.getElementById("mappingAlertArea"),
  andamentoInput: document.getElementById("andamentoInput"),
  eventoMapeamentoSelect: document.getElementById("eventoMapeamentoSelect"),
  tipoMatchSelect: document.getElementById("tipoMatchSelect"),
  salvarMapeamentoBtn: document.getElementById("salvarMapeamentoBtn"),
  tabelaMapeamentosBody: document.getElementById("tabelaMapeamentosBody"),
  regrasAlertArea: document.getElementById("regrasAlertArea"),
  regraId: document.getElementById("regraId"),
  eventoRegraSelect: document.getElementById("eventoRegraSelect"),
  providenciaRegraSelect: document.getElementById("providenciaRegraSelect"),
  prioridadeInput: document.getElementById("prioridadeInput"),
  geraPrazoInput: document.getElementById("geraPrazoInput"),
  prazoDiasInput: document.getElementById("prazoDiasInput"),
  tipoPrazoSelect: document.getElementById("tipoPrazoSelect"),
  padraoInput: document.getElementById("padraoInput"),
  observacaoInput: document.getElementById("observacaoInput"),
  salvarRegraBtn: document.getElementById("salvarRegraBtn"),
  tabelaRegrasBody: document.getElementById("tabelaRegrasBody"),
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
  carregarEventosParaMapeamento();
  carregarProvidenciasParaRegras();
  carregarMapeamentos();
  togglePrazoFields();
  setRegrasTableMessage("Selecione um evento para visualizar as regras.");
});

function bindEvents() {
  els.btnBuscar?.addEventListener("click", carregarEventos);
  els.btnNovo?.addEventListener("click", abrirModalCriar);
  els.salvarBtn?.addEventListener("click", salvarEvento);
  els.salvarMapeamentoBtn?.addEventListener("click", salvarMapeamento);
  els.salvarRegraBtn?.addEventListener("click", salvarRegra);
  els.geraPrazoInput?.addEventListener("change", togglePrazoFields);
  els.eventoRegraSelect?.addEventListener("change", () => {
    carregarRegras();
    resetRegraForm();
  });

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

  els.tabelaMapeamentosBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    if (actionBtn.dataset.action !== "delete") return;
    const id = actionBtn.dataset.id;
    if (!id) return;
    removerMapeamento(id);
  });

  els.tabelaRegrasBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const id = actionBtn.dataset.id;
    const regra = state.regras.find((item) => String(item.id) === String(id));
    if (!regra) return;
    if (actionBtn.dataset.action === "edit") {
      preencherFormularioRegra(regra);
    }
    if (actionBtn.dataset.action === "delete") {
      removerRegra(id);
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

function showMappingAlert(type, message) {
  if (!els.mappingAlertArea) return;
  if (!message) {
    els.mappingAlertArea.innerHTML = "";
    return;
  }
  els.mappingAlertArea.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function showRegrasAlert(type, message) {
  if (!els.regrasAlertArea) return;
  if (!message) {
    els.regrasAlertArea.innerHTML = "";
    return;
  }
  els.regrasAlertArea.innerHTML = `
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

async function carregarEventosParaMapeamento() {
  if (!els.eventoMapeamentoSelect) return;
  els.eventoMapeamentoSelect.innerHTML = `<option value="">Carregando...</option>`;

  try {
    const response = await authFetch(API_BASE);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar eventos.");
    }

    state.eventosParaMapeamento = Array.isArray(data) ? data : [];
    state.eventosParaRegras = [...state.eventosParaMapeamento];
    renderEventosSelect();
    renderEventosRegraSelect();
  } catch (error) {
    console.error("[eventos] erro ao carregar eventos para mapeamento", error);
    state.eventosParaMapeamento = [];
    state.eventosParaRegras = [];
    renderEventosSelect();
    renderEventosRegraSelect();
    showMappingAlert("danger", error.message);
  }
}

function renderEventosSelect() {
  if (!els.eventoMapeamentoSelect) return;

  if (!state.eventosParaMapeamento.length) {
    els.eventoMapeamentoSelect.innerHTML =
      '<option value="">Nenhum evento disponível</option>';
    return;
  }

  els.eventoMapeamentoSelect.innerHTML = `
    <option value="">Selecione...</option>
    ${state.eventosParaMapeamento
      .map(
        (evento) => `
      <option value="${evento.id}">${evento.nome || "-"}</option>
    `
      )
      .join("")}
  `;
}

function renderEventosRegraSelect() {
  if (!els.eventoRegraSelect) return;

  if (!state.eventosParaRegras.length) {
    els.eventoRegraSelect.innerHTML =
      '<option value="">Nenhum evento disponível</option>';
    return;
  }

  els.eventoRegraSelect.innerHTML = `
    <option value="">Selecione...</option>
    ${state.eventosParaRegras
      .map(
        (evento) => `
      <option value="${evento.id}">${evento.nome || "-"}</option>
    `
      )
      .join("")}
  `;
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

function setMappingTableMessage(text) {
  if (!els.tabelaMapeamentosBody) return;
  els.tabelaMapeamentosBody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center text-muted py-4">${text}</td>
    </tr>
  `;
}

function setRegrasTableMessage(text) {
  if (!els.tabelaRegrasBody) return;
  els.tabelaRegrasBody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted py-4">${text}</td>
    </tr>
  `;
}

function renderMapeamentosTable() {
  if (!els.tabelaMapeamentosBody) return;

  if (!state.mapeamentos.length) {
    setMappingTableMessage("Nenhum mapeamento cadastrado.");
    return;
  }

  els.tabelaMapeamentosBody.innerHTML = state.mapeamentos
    .map((mapeamento) => {
      const tipoMatchLabel = mapeamento.tipo_match === "contem" ? "Contém" : "Exato";
      const eventoNome = mapeamento.evento_processual?.nome || "-";

      return `
        <tr>
          <td>${mapeamento.andamento_descricao || "-"}</td>
          <td>${tipoMatchLabel}</td>
          <td>${eventoNome}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${mapeamento.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderRegrasTable() {
  if (!els.tabelaRegrasBody) return;

  if (!state.regras.length) {
    setRegrasTableMessage("Nenhuma regra cadastrada para o evento selecionado.");
    return;
  }

  els.tabelaRegrasBody.innerHTML = state.regras
    .map((regra) => {
      const eventoNome = regra.evento_processual?.nome || "-";
      const providenciaNome = regra.providencia_juridica?.nome || "-";
      const prazoLabel = regra.gera_prazo
        ? `${regra.prazo_dias || "-"} (${regra.tipo_prazo || "-"})`
        : "Sem prazo";
      const padraoLabel = regra.padrao ? "Sim" : "Não";
      const padraoClass = regra.padrao ? "bg-success" : "bg-secondary";

      return `
        <tr>
          <td>${eventoNome}</td>
          <td>${providenciaNome}</td>
          <td>${regra.prioridade ?? "-"}</td>
          <td>${prazoLabel}</td>
          <td><span class="badge ${padraoClass}">${padraoLabel}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${regra.id}">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${regra.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function togglePrazoFields() {
  const geraPrazo = els.geraPrazoInput?.checked ?? false;
  if (els.prazoDiasInput) els.prazoDiasInput.disabled = !geraPrazo;
  if (els.tipoPrazoSelect) els.tipoPrazoSelect.disabled = !geraPrazo;
  if (!geraPrazo) {
    if (els.prazoDiasInput) els.prazoDiasInput.value = "";
    if (els.tipoPrazoSelect) els.tipoPrazoSelect.value = "";
  }
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
    carregarEventosParaMapeamento();
  } catch (error) {
    console.error("[eventos] erro ao salvar", error);
    showAlert("danger", error.message);
  }
}

async function carregarMapeamentos() {
  setMappingTableMessage("Carregando mapeamentos...");
  showMappingAlert("info", "Buscando mapeamentos...");

  try {
    const response = await authFetch(MAPPING_API_BASE);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar mapeamentos.");
    }

    state.mapeamentos = Array.isArray(data) ? data : [];
    renderMapeamentosTable();
    showMappingAlert("success", `Lista atualizada (${state.mapeamentos.length})`);
  } catch (error) {
    console.error("[eventos] erro ao carregar mapeamentos", error);
    state.mapeamentos = [];
    renderMapeamentosTable();
    showMappingAlert("danger", error.message);
  }
}

async function salvarMapeamento() {
  const andamentoDescricao = (els.andamentoInput?.value || "").trim();
  const eventoId = (els.eventoMapeamentoSelect?.value || "").trim();
  const tipoMatch = (els.tipoMatchSelect?.value || "").trim();

  if (!andamentoDescricao) {
    showMappingAlert("warning", "Descrição do andamento é obrigatória.");
    return;
  }

  if (!eventoId) {
    showMappingAlert("warning", "Selecione um evento.");
    return;
  }

  const payload = {
    andamento_descricao: andamentoDescricao,
    evento_id: eventoId,
    tipo_match: tipoMatch || "exato",
  };

  try {
    const response = await authFetch(MAPPING_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao salvar mapeamento.");
    }

    if (els.andamentoInput) els.andamentoInput.value = "";
    if (els.eventoMapeamentoSelect) els.eventoMapeamentoSelect.value = "";
    if (els.tipoMatchSelect) els.tipoMatchSelect.value = "exato";
    showMappingAlert("success", "Mapeamento salvo com sucesso.");
    carregarMapeamentos();
  } catch (error) {
    console.error("[eventos] erro ao salvar mapeamento", error);
    showMappingAlert("danger", error.message);
  }
}

async function removerMapeamento(id) {
  const confirmed = window.confirm("Deseja remover este mapeamento?");
  if (!confirmed) return;

  try {
    const response = await authFetch(`${MAPPING_API_BASE}/${id}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao remover mapeamento.");
    }

    showMappingAlert("success", "Mapeamento removido.");
    carregarMapeamentos();
  } catch (error) {
    console.error("[eventos] erro ao remover mapeamento", error);
    showMappingAlert("danger", error.message);
  }
}

async function carregarProvidenciasParaRegras() {
  if (!els.providenciaRegraSelect) return;
  els.providenciaRegraSelect.innerHTML = `<option value="">Carregando...</option>`;

  try {
    const response = await authFetch(PROVIDENCIAS_API_BASE);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar providências.");
    }

    state.providencias = Array.isArray(data) ? data : [];
    renderProvidenciasSelect();
  } catch (error) {
    console.error("[eventos] erro ao carregar providencias", error);
    state.providencias = [];
    renderProvidenciasSelect();
    showRegrasAlert("danger", error.message);
  }
}

function renderProvidenciasSelect() {
  if (!els.providenciaRegraSelect) return;

  if (!state.providencias.length) {
    els.providenciaRegraSelect.innerHTML =
      '<option value="">Nenhuma providência disponível</option>';
    return;
  }

  els.providenciaRegraSelect.innerHTML = `
    <option value="">Selecione...</option>
    ${state.providencias
      .map(
        (providencia) => `
      <option value="${providencia.id}">${providencia.nome || "-"}</option>
    `
      )
      .join("")}
  `;
}

async function carregarRegras() {
  const eventoId = (els.eventoRegraSelect?.value || "").trim();
  if (!eventoId) {
    state.regras = [];
    setRegrasTableMessage("Selecione um evento para visualizar as regras.");
    return;
  }

  setRegrasTableMessage("Carregando regras...");
  showRegrasAlert("info", "Buscando regras...");

  const params = new URLSearchParams();
  params.set("eventoId", eventoId);

  try {
    const response = await authFetch(`${RULES_API_BASE}?${params.toString()}`);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar regras.");
    }

    state.regras = Array.isArray(data) ? data : [];
    renderRegrasTable();
    showRegrasAlert("success", `Lista atualizada (${state.regras.length})`);
  } catch (error) {
    console.error("[eventos] erro ao carregar regras", error);
    state.regras = [];
    renderRegrasTable();
    showRegrasAlert("danger", error.message);
  }
}

function resetRegraForm() {
  if (els.regraId) els.regraId.value = "";
  if (els.providenciaRegraSelect) els.providenciaRegraSelect.value = "";
  if (els.prioridadeInput) els.prioridadeInput.value = "1";
  if (els.geraPrazoInput) els.geraPrazoInput.checked = false;
  if (els.prazoDiasInput) els.prazoDiasInput.value = "";
  if (els.tipoPrazoSelect) els.tipoPrazoSelect.value = "";
  if (els.padraoInput) els.padraoInput.checked = false;
  if (els.observacaoInput) els.observacaoInput.value = "";
  togglePrazoFields();
}

function preencherFormularioRegra(regra) {
  if (els.regraId) els.regraId.value = regra.id;
  if (els.eventoRegraSelect) els.eventoRegraSelect.value = regra.evento_id || "";
  if (els.providenciaRegraSelect)
    els.providenciaRegraSelect.value = regra.providencia_id || "";
  if (els.prioridadeInput) els.prioridadeInput.value = regra.prioridade ?? 1;
  if (els.geraPrazoInput) els.geraPrazoInput.checked = Boolean(regra.gera_prazo);
  if (els.prazoDiasInput)
    els.prazoDiasInput.value = regra.prazo_dias ? String(regra.prazo_dias) : "";
  if (els.tipoPrazoSelect) els.tipoPrazoSelect.value = regra.tipo_prazo || "";
  if (els.padraoInput) els.padraoInput.checked = Boolean(regra.padrao);
  if (els.observacaoInput)
    els.observacaoInput.value = regra.observacao_juridica || "";
  togglePrazoFields();
}

async function salvarRegra() {
  const regraId = (els.regraId?.value || "").trim();
  const eventoId = (els.eventoRegraSelect?.value || "").trim();
  const providenciaId = (els.providenciaRegraSelect?.value || "").trim();
  const prioridade = (els.prioridadeInput?.value || "").trim();
  const geraPrazo = els.geraPrazoInput?.checked ?? false;
  const prazoDias = (els.prazoDiasInput?.value || "").trim();
  const tipoPrazo = (els.tipoPrazoSelect?.value || "").trim();
  const padrao = els.padraoInput?.checked ?? false;
  const observacaoJuridica = (els.observacaoInput?.value || "").trim();

  if (!eventoId) {
    showRegrasAlert("warning", "Selecione um evento.");
    return;
  }

  if (!providenciaId) {
    showRegrasAlert("warning", "Selecione uma providência.");
    return;
  }

  if (geraPrazo && (!prazoDias || !tipoPrazo)) {
    showRegrasAlert("warning", "Informe os dias e o tipo de prazo.");
    return;
  }

  const payload = {
    evento_id: eventoId,
    providencia_id: providenciaId,
    prioridade: prioridade ? Number(prioridade) : 1,
    gera_prazo: geraPrazo,
    prazo_dias: geraPrazo ? Number(prazoDias) : null,
    tipo_prazo: geraPrazo ? tipoPrazo : null,
    padrao,
    observacao_juridica: observacaoJuridica || null,
  };

  const method = regraId ? "PUT" : "POST";
  const url = regraId ? `${RULES_API_BASE}/${regraId}` : RULES_API_BASE;

  try {
    const response = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao salvar regra.");
    }

    showRegrasAlert("success", "Regra salva com sucesso.");
    resetRegraForm();
    carregarRegras();
  } catch (error) {
    console.error("[eventos] erro ao salvar regra", error);
    showRegrasAlert("danger", error.message);
  }
}

async function removerRegra(id) {
  const confirmed = window.confirm("Deseja remover esta regra?");
  if (!confirmed) return;

  try {
    const response = await authFetch(`${RULES_API_BASE}/${id}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao remover regra.");
    }

    showRegrasAlert("success", "Regra removida.");
    carregarRegras();
  } catch (error) {
    console.error("[eventos] erro ao remover regra", error);
    showRegrasAlert("danger", error.message);
  }
}
