const AUTH_TOKEN_KEY = "juristrack_token";
const USER_ID_KEY = "juristrack_userId";
const STATUS_FLOW = [
  "Aguardando",
  "Em Elaboração",
  "Em Revisão",
  "Pronto para Protocolo",
  "Protocolado",
];

const ELEMENTS = {
  title: document.getElementById("task-title"),
  subtitle: document.getElementById("task-subtitle"),
  priority: document.getElementById("task-priority"),
  status: document.getElementById("task-status"),
  due: document.getElementById("task-due"),
  feedback: document.getElementById("execucao-feedback"),
  statusFlow: document.getElementById("status-flow"),
  contextProcesso: document.getElementById("context-processo"),
  contextProcessoMeta: document.getElementById("context-processo-meta"),
  contextEvento: document.getElementById("context-evento"),
  contextEventoDescricao: document.getElementById("context-evento-descricao"),
  contextProvidencia: document.getElementById("context-providencia"),
  contextProvidenciaDescricao: document.getElementById("context-providencia-descricao"),
  checklistList: document.getElementById("checklist-list"),
  checklistEmpty: document.getElementById("checklist-empty"),
  checklistProgress: document.getElementById("checklist-progress"),
  checklistInput: document.getElementById("checklist-input"),
  checklistAdd: document.getElementById("checklist-add"),
  statusActions: document.getElementById("status-actions"),
  protocolFile: document.getElementById("protocol-file"),
  protocolSubmit: document.getElementById("protocol-submit"),
  protocolHint: document.getElementById("protocol-hint"),
};

const state = {
  taskId: null,
  task: null,
  checklist: [],
};

function showFeedback(message, variant = "danger") {
  const feedback = ELEMENTS.feedback;
  if (!feedback) return;
  if (!message) {
    feedback.classList.add("d-none");
    feedback.textContent = "";
    return;
  }
  feedback.textContent = message;
  feedback.className = `alert alert-${variant} mb-3`;
}

function getAuthHeaders(isJson = true) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  const headers = { Authorization: `Bearer ${token}` };
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
}

function ensureAuthenticated() {
  const headers = getAuthHeaders(false);
  if (!headers) {
    window.location.href = "/login";
    return null;
  }
  return headers;
}

async function fetchJson(url, options = {}) {
  const headers = getAuthHeaders(!(options.body instanceof FormData));
  if (!headers) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let message = "Falha na requisicao.";
    try {
      const payload = await response.json();
      message = payload?.error || payload?.message || message;
    } catch {
      message = await response.text();
    }
    if (response.status === 401) {
      window.location.href = "/login";
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function daysDiffFromToday(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function buildDueLabel(value) {
  const diff = daysDiffFromToday(value);
  if (diff === null) return "Data limite nao informada";
  if (diff < 0) return `Atrasado ${Math.abs(diff)} dia(s)`;
  if (diff === 0) return "Vence hoje";
  return `Vence em ${diff} dia(s)`;
}

function setHeader(task) {
  if (!task) return;
  const providenciaNome = task.providencia?.nome || "Providencia";
  const processoNumero = task.processo?.numero || "Processo nao informado";
  const dataLimite = task.data_limite ? formatDate(task.data_limite) : "--";
  const dueLabel = buildDueLabel(task.data_limite);

  if (ELEMENTS.title) {
    ELEMENTS.title.textContent = providenciaNome;
  }
  if (ELEMENTS.subtitle) {
    ELEMENTS.subtitle.textContent = `${processoNumero} · ${dataLimite} · ${dueLabel}`;
  }
  if (ELEMENTS.priority) {
    ELEMENTS.priority.textContent = task.prioridade || "Prioridade";
  }
  if (ELEMENTS.status) {
    ELEMENTS.status.textContent = task.status?.nome || "Sem status";
    ELEMENTS.status.style.backgroundColor = task.status?.cor_hex || "#64748b";
  }
  if (ELEMENTS.due) {
    ELEMENTS.due.textContent = task.data_limite
      ? `Prazo: ${dataLimite}`
      : "Prazo nao informado";
  }
}

function setContext(task) {
  if (!task) return;
  if (ELEMENTS.contextProcesso) {
    ELEMENTS.contextProcesso.textContent = task.processo?.numero || "--";
  }
  if (ELEMENTS.contextProcessoMeta) {
    const assunto = task.processo?.assunto || "Assunto nao informado";
    const pasta = task.processo?.pasta || "Pasta nao informada";
    ELEMENTS.contextProcessoMeta.textContent = `${assunto} · ${pasta}`;
  }
  if (ELEMENTS.contextEvento) {
    ELEMENTS.contextEvento.textContent = task.evento?.nome || "--";
  }
  if (ELEMENTS.contextEventoDescricao) {
    ELEMENTS.contextEventoDescricao.textContent = task.evento?.descricao || "Sem descricao disponivel.";
  }
  if (ELEMENTS.contextProvidencia) {
    ELEMENTS.contextProvidencia.textContent = task.providencia?.nome || "--";
  }
  if (ELEMENTS.contextProvidenciaDescricao) {
    ELEMENTS.contextProvidenciaDescricao.textContent =
      task.providencia?.descricao || "Sem orientacoes cadastradas.";
  }
}

function updateStatusFlow(statusName) {
  if (!ELEMENTS.statusFlow) return;
  const steps = Array.from(ELEMENTS.statusFlow.querySelectorAll(".status-step"));
  const currentIndex = STATUS_FLOW.findIndex(
    (status) => status.toLowerCase() === (statusName || "").toLowerCase()
  );

  steps.forEach((step, index) => {
    step.classList.remove("is-active", "is-complete");
    if (index < currentIndex) {
      step.classList.add("is-complete");
    } else if (index === currentIndex) {
      step.classList.add("is-active");
    }
  });
}

function renderStatusActions(task) {
  if (!ELEMENTS.statusActions) return;
  ELEMENTS.statusActions.innerHTML = "";
  if (!task?.status?.nome) return;

  const statusName = task.status.nome;
  const actions = [];

  if (statusName === "Aguardando") {
    actions.push({ label: "Iniciar", next: "Em Elaboração", variant: "primary" });
  }
  if (statusName === "Em Elaboração") {
    actions.push({ label: "Enviar para Revisao", next: "Em Revisão", variant: "warning" });
    if (!task.revisor?.id) {
      actions.push({ label: "Pular Revisao", next: "Pronto para Protocolo", variant: "outline-secondary" });
    }
  }
  if (statusName === "Em Revisão") {
    actions.push({ label: "Aprovar", next: "Pronto para Protocolo", variant: "success" });
  }

  if (!actions.length) {
    const info = document.createElement("span");
    info.className = "text-muted";
    info.textContent =
      statusName === "Protocolado"
        ? "Tarefa finalizada."
        : "Nenhuma acao disponivel para este status.";
    ELEMENTS.statusActions.appendChild(info);
    return;
  }

  actions.forEach((action) => {
    const button = document.createElement("button");
    const variant = action.variant || "primary";
    button.type = "button";
    button.className =
      variant.startsWith("outline")
        ? `btn btn-${variant}`
        : `btn btn-${variant}`;
    button.textContent = action.label;
    button.addEventListener("click", () => handleStatusUpdate(action.next));
    ELEMENTS.statusActions.appendChild(button);
  });
}

function renderChecklist(items) {
  if (!ELEMENTS.checklistList) return;
  ELEMENTS.checklistList.innerHTML = "";
  if (!items.length) {
    if (ELEMENTS.checklistEmpty) ELEMENTS.checklistEmpty.classList.remove("d-none");
    return;
  }
  if (ELEMENTS.checklistEmpty) ELEMENTS.checklistEmpty.classList.add("d-none");

  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = `checklist-item${item.concluido ? " is-done" : ""}`;

    const content = document.createElement("div");
    const title = document.createElement("div");
    title.className = "checklist-title";
    title.textContent = item.titulo || "Item";

    const meta = document.createElement("div");
    const badgeClass = item.obrigatorio ? "checklist-required" : "checklist-optional";
    const badgeLabel = item.obrigatorio ? "Obrigatorio" : "Opcional";
    meta.className = "checklist-meta";
    meta.innerHTML = `<span class="${badgeClass}">${badgeLabel}</span>`;

    content.appendChild(title);
    content.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "checklist-actions";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input mt-1";
    checkbox.checked = Boolean(item.concluido);
    checkbox.addEventListener("change", () => toggleChecklistItem(item, checkbox));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-outline-danger btn-sm";
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.addEventListener("click", () => removeChecklistItem(item));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn btn-outline-secondary btn-sm";
    editButton.innerHTML = '<i class="fas fa-pen"></i>';
    editButton.addEventListener("click", () => editChecklistItem(item));

    actions.appendChild(checkbox);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    wrapper.appendChild(content);
    wrapper.appendChild(actions);
    ELEMENTS.checklistList.appendChild(wrapper);
  });
}

function updateChecklistProgress(items) {
  if (!ELEMENTS.checklistProgress) return;
  const total = items.length;
  const done = items.filter((item) => item.concluido).length;
  ELEMENTS.checklistProgress.textContent = `${done}/${total}`;
}

function isChecklistRequiredDone(items) {
  return items
    .filter((item) => item.obrigatorio)
    .every((item) => item.concluido);
}

function updateProtocolState() {
  if (!ELEMENTS.protocolSubmit || !state.task) return;
  const requiredDone = isChecklistRequiredDone(state.checklist);
  const fileSelected = ELEMENTS.protocolFile?.files?.length;
  const isReadyStatus = state.task?.status?.nome === "Pronto para Protocolo";
  const canProtocol = requiredDone && fileSelected && isReadyStatus;

  ELEMENTS.protocolSubmit.disabled = !canProtocol;
  if (!ELEMENTS.protocolHint) return;
  if (!isReadyStatus) {
    ELEMENTS.protocolHint.textContent = "Aguardando status pronto para protocolo.";
  } else if (!requiredDone) {
    ELEMENTS.protocolHint.textContent = "Conclua todos os itens obrigatorios.";
  } else if (!fileSelected) {
    ELEMENTS.protocolHint.textContent = "Selecione um arquivo para continuar.";
  } else {
    ELEMENTS.protocolHint.textContent = "Tudo pronto para protocolar.";
  }
}

async function loadTask() {
  if (!state.taskId) return;
  const task = await fetchJson(`/api/tarefas/${state.taskId}`);
  state.task = task;
  setHeader(task);
  setContext(task);
  updateStatusFlow(task.status?.nome || "");
  renderStatusActions(task);
  updateProtocolState();
}

async function loadChecklist() {
  if (!state.taskId) return;
  const items = await fetchJson(`/api/tarefas/${state.taskId}/checklist`);
  state.checklist = Array.isArray(items) ? items : [];
  renderChecklist(state.checklist);
  updateChecklistProgress(state.checklist);
  updateProtocolState();
}

async function toggleChecklistItem(item, checkbox) {
  if (!state.taskId || !item?.id) return;
  checkbox.disabled = true;
  try {
    const payload = { concluido: checkbox.checked };
    await fetchJson(`/api/tarefas/${state.taskId}/checklist/${item.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    await loadChecklist();
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showFeedback(error.message || "Erro ao atualizar checklist.", "warning");
  } finally {
    checkbox.disabled = false;
  }
}

async function addChecklistItem() {
  const title = ELEMENTS.checklistInput?.value?.trim();
  if (!title) {
    showFeedback("Informe a descricao do item.", "warning");
    return;
  }
  try {
    await fetchJson(`/api/tarefas/${state.taskId}/checklist`, {
      method: "POST",
      body: JSON.stringify({ titulo: title, obrigatorio: false }),
    });
    if (ELEMENTS.checklistInput) ELEMENTS.checklistInput.value = "";
    await loadChecklist();
  } catch (error) {
    showFeedback(error.message || "Erro ao adicionar item.", "warning");
  }
}

async function removeChecklistItem(item) {
  if (!state.taskId || !item?.id) return;
  try {
    await fetchJson(`/api/tarefas/${state.taskId}/checklist/${item.id}`, {
      method: "DELETE",
    });
    await loadChecklist();
  } catch (error) {
    showFeedback(error.message || "Erro ao remover item.", "warning");
  }
}

async function editChecklistItem(item) {
  if (!state.taskId || !item?.id) return;
  const currentTitle = item.titulo || "";
  const newTitle = window.prompt("Editar item do checklist:", currentTitle);
  if (newTitle === null) return;
  const trimmed = newTitle.trim();
  if (!trimmed || trimmed === currentTitle) return;

  try {
    const created = await fetchJson(`/api/tarefas/${state.taskId}/checklist`, {
      method: "POST",
      body: JSON.stringify({
        titulo: trimmed,
        obrigatorio: item.obrigatorio,
        ordem: item.ordem ?? 0,
      }),
    });

    if (item.concluido && created?.id) {
      await fetchJson(`/api/tarefas/${state.taskId}/checklist/${created.id}`, {
        method: "PUT",
        body: JSON.stringify({ concluido: true }),
      });
    }

    await fetchJson(`/api/tarefas/${state.taskId}/checklist/${item.id}`, {
      method: "DELETE",
    });

    await loadChecklist();
  } catch (error) {
    showFeedback(error.message || "Erro ao editar item.", "warning");
  }
}

async function handleStatusUpdate(nextStatus) {
  if (!state.taskId || !nextStatus) return;
  try {
    const payload = { status: nextStatus };
    const updated = await fetchJson(`/api/tarefas/${state.taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    state.task = updated;
    setHeader(updated);
    updateStatusFlow(updated.status?.nome || "");
    renderStatusActions(updated);
    updateProtocolState();
    showFeedback("Status atualizado com sucesso.", "success");
  } catch (error) {
    showFeedback(error.message || "Erro ao atualizar status.", "warning");
  }
}

async function handleProtocolSubmit() {
  if (!state.taskId || !ELEMENTS.protocolFile?.files?.length) return;
  const file = ELEMENTS.protocolFile.files[0];
  const formData = new FormData();
  formData.append("file", file);
  ELEMENTS.protocolSubmit.disabled = true;
  try {
    const response = await fetchJson(`/api/tarefas/${state.taskId}/protocolar`, {
      method: "POST",
      body: formData,
    });
    state.task = response?.task || state.task;
    setHeader(state.task);
    updateStatusFlow(state.task?.status?.nome || "");
    renderStatusActions(state.task);
    await loadChecklist();
    showFeedback("Tarefa protocolada com sucesso.", "success");
  } catch (error) {
    showFeedback(error.message || "Erro ao protocolar.", "warning");
  } finally {
    updateProtocolState();
  }
}

function parseTaskId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    showFeedback("ID da tarefa nao informado na URL.", "warning");
    return null;
  }
  return id;
}

function bindEvents() {
  ELEMENTS.checklistAdd?.addEventListener("click", addChecklistItem);
  ELEMENTS.checklistInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addChecklistItem();
    }
  });
  ELEMENTS.protocolFile?.addEventListener("change", updateProtocolState);
  ELEMENTS.protocolSubmit?.addEventListener("click", handleProtocolSubmit);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!ensureAuthenticated()) return;
  state.taskId = parseTaskId();
  if (!state.taskId) return;
  bindEvents();
  try {
    await Promise.all([loadTask(), loadChecklist()]);
  } catch (error) {
    showFeedback("Nao foi possivel carregar a tarefa. Tente novamente.", "warning");
  }
});
