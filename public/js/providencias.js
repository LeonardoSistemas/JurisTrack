const API_BASE = "/api/config/providencias";
const AUTH_TOKEN_KEY = "juristrack_token";

const state = {
  providencias: [],
  checklistItems: [],
  providenciaModels: [],
  modelosDisponiveis: [],
  currentProvidenciaId: null,
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
  checklistAlertArea: document.getElementById("checklistAlertArea"),
  checklistDisabledMessage: document.getElementById("checklistDisabledMessage"),
  checklistFormArea: document.getElementById("checklistFormArea"),
  checklistItemId: document.getElementById("checklistItemId"),
  checklistTituloInput: document.getElementById("checklistTituloInput"),
  checklistDescricaoInput: document.getElementById("checklistDescricaoInput"),
  checklistOrdemInput: document.getElementById("checklistOrdemInput"),
  checklistObrigatorioInput: document.getElementById("checklistObrigatorioInput"),
  salvarChecklistBtn: document.getElementById("salvarChecklistBtn"),
  limparChecklistBtn: document.getElementById("limparChecklistBtn"),
  tabelaChecklistBody: document.getElementById("tabelaChecklistBody"),
  modelosAlertArea: document.getElementById("modelosAlertArea"),
  modelosDisabledMessage: document.getElementById("modelosDisabledMessage"),
  modelosFormArea: document.getElementById("modelosFormArea"),
  modeloSearchInput: document.getElementById("modeloSearchInput"),
  buscarModelosBtn: document.getElementById("buscarModelosBtn"),
  modelosDisponiveisList: document.getElementById("modelosDisponiveisList"),
  tabelaModelosVinculadosBody: document.getElementById("tabelaModelosVinculadosBody"),
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
  els.salvarChecklistBtn?.addEventListener("click", salvarChecklistItem);
  els.limparChecklistBtn?.addEventListener("click", resetChecklistForm);
  els.buscarModelosBtn?.addEventListener("click", renderModelosDisponiveis);
  els.modeloSearchInput?.addEventListener("keyup", (event) => {
    if (event.key === "Enter") renderModelosDisponiveis();
  });

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

  els.tabelaChecklistBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const id = actionBtn.dataset.id;
    const item = state.checklistItems.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    if (actionBtn.dataset.action === "edit") {
      preencherChecklistForm(item);
    }
    if (actionBtn.dataset.action === "delete") {
      removerChecklistItem(item.id);
    }
  });

  els.modelosDisponiveisList?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const modeloId = actionBtn.dataset.id;
    if (actionBtn.dataset.action === "link") {
      vincularModelo(modeloId);
    }
  });

  els.tabelaModelosVinculadosBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;
    const modeloId = actionBtn.dataset.id;
    if (actionBtn.dataset.action === "unlink") {
      desvincularModelo(modeloId);
    }
  });

  els.modalEl?.addEventListener("hidden.bs.modal", resetModalSections);
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

function showChecklistAlert(type, message) {
  if (!els.checklistAlertArea) return;
  if (!message) {
    els.checklistAlertArea.innerHTML = "";
    return;
  }
  els.checklistAlertArea.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function showModelosAlert(type, message) {
  if (!els.modelosAlertArea) return;
  if (!message) {
    els.modelosAlertArea.innerHTML = "";
    return;
  }
  els.modelosAlertArea.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function setChecklistTableMessage(text) {
  if (!els.tabelaChecklistBody) return;
  els.tabelaChecklistBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-muted py-3">${text}</td>
    </tr>
  `;
}

function setModelosVinculadosMessage(text) {
  if (!els.tabelaModelosVinculadosBody) return;
  els.tabelaModelosVinculadosBody.innerHTML = `
    <tr>
      <td colspan="3" class="text-center text-muted py-3">${text}</td>
    </tr>
  `;
}

function setModelosDisponiveisMessage(text) {
  if (!els.modelosDisponiveisList) return;
  els.modelosDisponiveisList.innerHTML = `
    <div class="list-group-item text-muted text-center">${text}</div>
  `;
}

function setChecklistSectionEnabled(isEnabled) {
  els.checklistDisabledMessage?.classList.toggle("d-none", isEnabled);
  if (!els.checklistFormArea) return;
  els.checklistFormArea
    .querySelectorAll("input, button, textarea, select")
    .forEach((element) => {
      element.disabled = !isEnabled;
    });
}

function setModelosSectionEnabled(isEnabled) {
  els.modelosDisabledMessage?.classList.toggle("d-none", isEnabled);
  if (!els.modelosFormArea) return;
  els.modelosFormArea
    .querySelectorAll("input, button, textarea, select")
    .forEach((element) => {
      element.disabled = !isEnabled;
    });
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
  state.currentProvidenciaId = null;
  resetModalSections();
  setChecklistSectionEnabled(false);
  setModelosSectionEnabled(false);
  setChecklistTableMessage("Salve a providência para adicionar itens.");
  setModelosVinculadosMessage("Salve a providência para vincular modelos.");
  setModelosDisponiveisMessage("Salve a providência para buscar modelos.");
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
  state.currentProvidenciaId = providencia.id;
  resetModalSections();
  setChecklistSectionEnabled(true);
  setModelosSectionEnabled(true);
  carregarChecklist();
  carregarModelosVinculados();
  carregarModelosDisponiveis();
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

function resetModalSections() {
  showChecklistAlert("", "");
  showModelosAlert("", "");
  state.checklistItems = [];
  state.providenciaModels = [];
  state.modelosDisponiveis = [];
  resetChecklistForm();
  resetModelosFilters();
  setChecklistTableMessage("Nenhum item carregado.");
  setModelosVinculadosMessage("Nenhum modelo vinculado.");
  setModelosDisponiveisMessage("Busque modelos para vincular.");
}

function resetChecklistForm() {
  if (!els.checklistItemId) return;
  els.checklistItemId.value = "";
  els.checklistTituloInput.value = "";
  els.checklistDescricaoInput.value = "";
  els.checklistObrigatorioInput.checked = true;
  els.checklistOrdemInput.value = getNextChecklistOrder();
  if (els.salvarChecklistBtn) {
    els.salvarChecklistBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Adicionar';
  }
}

function preencherChecklistForm(item) {
  if (!item || !els.checklistItemId) return;
  els.checklistItemId.value = item.id;
  els.checklistTituloInput.value = item.titulo || "";
  els.checklistDescricaoInput.value = item.descricao || "";
  els.checklistOrdemInput.value = item.ordem || "";
  els.checklistObrigatorioInput.checked = Boolean(item.obrigatorio);
  if (els.salvarChecklistBtn) {
    els.salvarChecklistBtn.innerHTML = '<i class="fas fa-save me-1"></i>Atualizar';
  }
}

function getNextChecklistOrder() {
  if (!Array.isArray(state.checklistItems) || !state.checklistItems.length) {
    return 1;
  }
  const maxOrder = state.checklistItems.reduce((maxValue, item) => {
    const orderValue = Number(item.ordem) || 0;
    return Math.max(maxValue, orderValue);
  }, 0);
  return maxOrder + 1;
}

async function carregarChecklist() {
  if (!state.currentProvidenciaId) return;
  setChecklistTableMessage("Carregando checklist...");
  showChecklistAlert("info", "Buscando itens do checklist...");

  try {
    const response = await authFetch(
      `/api/config/providencias/${state.currentProvidenciaId}/checklist`
    );
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao carregar checklist.");
    }
    state.checklistItems = Array.isArray(data) ? data : [];
    renderChecklistTable();
    resetChecklistForm();
    showChecklistAlert("success", "Checklist atualizado.");
  } catch (error) {
    console.error("[providencias] erro ao carregar checklist", error);
    state.checklistItems = [];
    renderChecklistTable();
    showChecklistAlert("danger", error.message);
  }
}

function renderChecklistTable() {
  if (!els.tabelaChecklistBody) return;
  if (!state.checklistItems.length) {
    setChecklistTableMessage("Nenhum item cadastrado.");
    return;
  }

  els.tabelaChecklistBody.innerHTML = state.checklistItems
    .map((item) => {
      const badgeClass = item.obrigatorio ? "bg-warning text-dark" : "bg-secondary";
      const badgeLabel = item.obrigatorio ? "Obrigatório" : "Opcional";
      const rowClass = item.obrigatorio ? "table-warning" : "";
      return `
        <tr class="${rowClass}">
          <td>${item.ordem ?? "-"}</td>
          <td>${item.titulo || "-"}</td>
          <td>${item.descricao || "-"}</td>
          <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${item.id}">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${item.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function salvarChecklistItem() {
  if (!state.currentProvidenciaId) return;
  const itemId = (els.checklistItemId?.value || "").trim();
  const titulo = (els.checklistTituloInput?.value || "").trim();
  const descricao = (els.checklistDescricaoInput?.value || "").trim();
  const ordemValue = (els.checklistOrdemInput?.value || "").trim();
  const obrigatorio = els.checklistObrigatorioInput?.checked ?? true;

  if (!titulo) {
    showChecklistAlert("warning", "Título do checklist é obrigatório.");
    return;
  }

  const payload = {
    titulo,
    descricao: descricao || null,
    obrigatorio,
  };

  if (ordemValue) {
    payload.ordem = Number(ordemValue);
  }

  const method = itemId ? "PUT" : "POST";
  const url = itemId
    ? `/api/config/providencias/checklist/${itemId}`
    : `/api/config/providencias/${state.currentProvidenciaId}/checklist`;

  try {
    const response = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao salvar item do checklist.");
    }
    showChecklistAlert("success", "Checklist atualizado com sucesso.");
    resetChecklistForm();
    carregarChecklist();
  } catch (error) {
    console.error("[providencias] erro ao salvar checklist", error);
    showChecklistAlert("danger", error.message);
  }
}

async function removerChecklistItem(itemId) {
  if (!itemId) return;
  const confirmed = window.confirm("Deseja remover este item do checklist?");
  if (!confirmed) return;

  try {
    const response = await authFetch(
      `/api/config/providencias/checklist/${itemId}`,
      { method: "DELETE" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao remover item do checklist.");
    }
    showChecklistAlert("success", "Item removido com sucesso.");
    carregarChecklist();
  } catch (error) {
    console.error("[providencias] erro ao remover checklist", error);
    showChecklistAlert("danger", error.message);
  }
}

function resetModelosFilters() {
  if (els.modeloSearchInput) {
    els.modeloSearchInput.value = "";
  }
  if (els.modelosDisponiveisList) {
    els.modelosDisponiveisList.innerHTML = "";
  }
}

async function carregarModelosDisponiveis() {
  if (!state.currentProvidenciaId) return;
  setModelosDisponiveisMessage("Carregando modelos...");
  showModelosAlert("info", "Carregando modelos disponíveis...");

  try {
    const response = await authFetch("/modelos");
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao buscar modelos.");
    }
    state.modelosDisponiveis = Array.isArray(data) ? data : [];
    renderModelosDisponiveis();
    showModelosAlert("success", "Modelos carregados.");
  } catch (error) {
    console.error("[providencias] erro ao carregar modelos", error);
    state.modelosDisponiveis = [];
    renderModelosDisponiveis();
    showModelosAlert("danger", error.message);
  }
}

function renderModelosDisponiveis() {
  if (!els.modelosDisponiveisList) return;
  const query = (els.modeloSearchInput?.value || "").trim().toLowerCase();
  const linkedIds = new Set(
    state.providenciaModels.map((item) => String(item.modelo_id))
  );
  const filtered = state.modelosDisponiveis.filter((modelo) => {
    const matches = !query || modelo.titulo?.toLowerCase().includes(query);
    return matches && !linkedIds.has(String(modelo.id));
  });

  if (!filtered.length) {
    setModelosDisponiveisMessage("Nenhum modelo encontrado para vincular.");
    return;
  }

  els.modelosDisponiveisList.innerHTML = filtered
    .map((modelo) => {
      return `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${modelo.titulo || "Sem título"}</div>
            <small class="text-muted">${modelo.descricao || ""}</small>
          </div>
          <button class="btn btn-sm btn-outline-primary" data-action="link" data-id="${modelo.id}">
            Vincular
          </button>
        </div>
      `;
    })
    .join("");
}

async function carregarModelosVinculados() {
  if (!state.currentProvidenciaId) return;
  setModelosVinculadosMessage("Carregando modelos vinculados...");
  showModelosAlert("info", "Buscando modelos vinculados...");

  try {
    const response = await authFetch(
      `/api/config/providencias/${state.currentProvidenciaId}/modelos`
    );
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao carregar modelos vinculados.");
    }
    state.providenciaModels = Array.isArray(data) ? data : [];
    renderModelosVinculados();
    renderModelosDisponiveis();
    showModelosAlert("success", "Modelos vinculados atualizados.");
  } catch (error) {
    console.error("[providencias] erro ao carregar modelos vinculados", error);
    state.providenciaModels = [];
    renderModelosVinculados();
    showModelosAlert("danger", error.message);
  }
}

function renderModelosVinculados() {
  if (!els.tabelaModelosVinculadosBody) return;
  if (!state.providenciaModels.length) {
    setModelosVinculadosMessage("Nenhum modelo vinculado.");
    return;
  }

  els.tabelaModelosVinculadosBody.innerHTML = state.providenciaModels
    .map((item) => {
      const modelo = item.modelo || {};
      return `
        <tr>
          <td>${modelo.titulo || "-"}</td>
          <td>${modelo.descricao || "-"}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-action="unlink" data-id="${item.modelo_id}">
              <i class="fas fa-unlink"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function vincularModelo(modeloId) {
  if (!modeloId || !state.currentProvidenciaId) return;
  try {
    const response = await authFetch(
      `/api/config/providencias/${state.currentProvidenciaId}/modelos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelo_id: modeloId }),
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao vincular modelo.");
    }
    showModelosAlert("success", "Modelo vinculado com sucesso.");
    carregarModelosVinculados();
  } catch (error) {
    console.error("[providencias] erro ao vincular modelo", error);
    showModelosAlert("danger", error.message);
  }
}

async function desvincularModelo(modeloId) {
  if (!modeloId || !state.currentProvidenciaId) return;
  const confirmed = window.confirm("Deseja remover este vínculo?");
  if (!confirmed) return;

  try {
    const response = await authFetch(
      `/api/config/providencias/${state.currentProvidenciaId}/modelos/${modeloId}`,
      { method: "DELETE" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao desvincular modelo.");
    }
    showModelosAlert("success", "Modelo desvinculado com sucesso.");
    carregarModelosVinculados();
  } catch (error) {
    console.error("[providencias] erro ao desvincular modelo", error);
    showModelosAlert("danger", error.message);
  }
}
