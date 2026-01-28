const AUTH_TOKEN_KEY = "juristrack_token";
const USER_ID_KEY = "juristrack_userId";
const TASK_EXECUTION_PATH = "/tarefas-execucao";

const STATUS_OPTIONS = [
  "Aguardando",
  "Em Elaboração",
  "Em Revisão",
  "Pronto para Protocolo",
  "Protocolado",
];

const PRIORITY_META = {
  "Crítico": { chipClass: "task-chip-critical", dotClass: "priority-critical" },
  "Atenção": { chipClass: "task-chip-warning", dotClass: "priority-warning" },
  "Tranquilo": { chipClass: "task-chip-ok", dotClass: "priority-ok" },
};

const ELEMENTS = {
  feedback: document.getElementById("fila-feedback"),
  filtroProcesso: document.getElementById("filtroProcesso"),
  filtroStatus: document.getElementById("filtroStatus"),
  filtroResponsavel: document.getElementById("filtroResponsavel"),
  filtroMinhas: document.getElementById("filtroMinhas"),
  listaCritico: document.getElementById("lista-critico"),
  listaAtencao: document.getElementById("lista-atencao"),
  listaTranquilo: document.getElementById("lista-tranquilo"),
  countCritico: document.getElementById("count-critico"),
  countAtencao: document.getElementById("count-atencao"),
  countTranquilo: document.getElementById("count-tranquilo"),
};

let debounceTimer;

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

function setLoadingState() {
  [ELEMENTS.listaCritico, ELEMENTS.listaAtencao, ELEMENTS.listaTranquilo].forEach(
    (list) => {
      if (list) {
        list.innerHTML = '<div class="text-muted text-center py-3">Carregando tarefas...</div>';
      }
    }
  );
}

function parseLocalDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDate(value) {
  const date = parseLocalDate(value);
  if (!date) return "--";
  return date.toLocaleDateString("pt-BR");
}

function daysDiffFromToday(value) {
  const date = parseLocalDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

function buildDueLabel(value) {
  const diff = daysDiffFromToday(value);
  if (diff === null) return "Data limite não informada";
  if (diff < 0) {
    return `Atrasado ${Math.abs(diff)} dia(s)`;
  }
  if (diff === 0) return "Vence hoje";
  return `Vence em ${diff} dia(s)`;
}

function normalizePriority(value) {
  if (!value) return "Tranquilo";
  return PRIORITY_META[value] ? value : "Tranquilo";
}

function buildTaskItem(task) {
  const prioridade = normalizePriority(task.prioridade);
  const meta = PRIORITY_META[prioridade];
  const processoNumero = task.processo?.numero || "Processo não informado";
  const providenciaNome = task.providencia?.nome || "Providência não informada";
  const eventoNome = task.evento?.nome || "Evento não informado";
  const responsavel = task.responsavel?.nome || "Responsável não definido";
  const statusName = task.status?.nome || "Sem status";
  const statusColor = task.status?.cor_hex || "#64748b";
  const dataLimite = task.data_limite ? formatDate(task.data_limite) : "--";
  const dueLabel = buildDueLabel(task.data_limite);

  const wrapper = document.createElement("div");
  wrapper.className = "task-item";
  wrapper.setAttribute("role", "button");
  wrapper.setAttribute("tabindex", "0");
  wrapper.dataset.taskId = task.id;

  wrapper.innerHTML = `
    <div class="task-item-header">
      <div>
        <p class="task-title mb-1">${providenciaNome}</p>
        <div class="task-process">${processoNumero}</div>
      </div>
      <div class="task-chip ${meta.chipClass}">
        <span class="priority-dot ${meta.dotClass}"></span>${prioridade}
      </div>
    </div>
    <p class="task-meta mt-2 mb-0">${eventoNome}</p>
    <div class="task-footer">
      <span class="task-status" style="background-color: ${statusColor};">${statusName}</span>
      <span class="task-owner"><i class="fas fa-user me-1"></i>${responsavel}</span>
      <span class="task-date"><i class="far fa-calendar-alt me-1"></i>${dataLimite} · ${dueLabel}</span>
    </div>
  `;

  const goToTask = () => {
    if (!task.id) return;
    window.location.href = `${TASK_EXECUTION_PATH}?id=${task.id}`;
  };

  wrapper.addEventListener("click", goToTask);
  wrapper.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToTask();
    }
  });

  return wrapper;
}

function renderTaskList(listElement, tasks, emptyMessage) {
  if (!listElement) return;
  listElement.innerHTML = "";

  if (!tasks.length) {
    listElement.innerHTML = `<div class="text-muted text-center py-3">${emptyMessage}</div>`;
    return;
  }

  tasks.forEach((task) => {
    listElement.appendChild(buildTaskItem(task));
  });
}

function updateCounts(groups) {
  if (ELEMENTS.countCritico) ELEMENTS.countCritico.textContent = groups["Crítico"].length;
  if (ELEMENTS.countAtencao) ELEMENTS.countAtencao.textContent = groups["Atenção"].length;
  if (ELEMENTS.countTranquilo) ELEMENTS.countTranquilo.textContent = groups["Tranquilo"].length;
}

async function loadUsers() {
  if (!ELEMENTS.filtroResponsavel) return;
  try {
    const users = await fetchJson("/api/users?status=ativo");
    const options = ['<option value="">Todos</option>'];
    users.forEach((user) => {
      options.push(`<option value="${user.id}">${user.nome || user.email}</option>`);
    });
    ELEMENTS.filtroResponsavel.innerHTML = options.join("");
  } catch (error) {
    console.error("[filaTrabalho] erro ao carregar usuários", error);
  }
}

function loadStatusOptions() {
  if (!ELEMENTS.filtroStatus) return;
  const options = ['<option value="">Todos</option>'];
  STATUS_OPTIONS.forEach((status) => {
    options.push(`<option value="${status}">${status}</option>`);
  });
  ELEMENTS.filtroStatus.innerHTML = options.join("");
}

function buildQueryParams() {
  const params = new URLSearchParams();
  const busca = ELEMENTS.filtroProcesso?.value?.trim();
  const status = ELEMENTS.filtroStatus?.value;
  const responsavel = ELEMENTS.filtroResponsavel?.value;
  const minhas = ELEMENTS.filtroMinhas?.checked;
  const currentUserId = localStorage.getItem(USER_ID_KEY);

  if (busca) params.append("numero_processo", busca);
  if (status) params.append("status", status);

  if (minhas && currentUserId) {
    params.append("responsavel_id", currentUserId);
  } else if (responsavel) {
    params.append("responsavel_id", responsavel);
  }

  return params;
}

function handleMineToggle() {
  const isMine = ELEMENTS.filtroMinhas?.checked;
  const currentUserId = localStorage.getItem(USER_ID_KEY);

  if (isMine && !currentUserId) {
    showFeedback("Não foi possível identificar o usuário logado.", "warning");
    if (ELEMENTS.filtroMinhas) {
      ELEMENTS.filtroMinhas.checked = false;
    }
    return;
  }

  if (ELEMENTS.filtroResponsavel) {
    ELEMENTS.filtroResponsavel.disabled = Boolean(isMine);
    if (isMine) {
      ELEMENTS.filtroResponsavel.value = "";
    }
  }
  scheduleLoadTasks();
}

async function loadTasks() {
  showFeedback(null);
  setLoadingState();

  if (!ensureAuthenticated()) {
    return;
  }

  try {
    const params = buildQueryParams();
    const url = `/api/tarefas?${params.toString()}`;
    const tasks = await fetchJson(url);

    const groups = {
      "Crítico": [],
      "Atenção": [],
      "Tranquilo": [],
    };

    tasks.forEach((task) => {
      const prioridade = normalizePriority(task.prioridade);
      groups[prioridade].push(task);
    });

    updateCounts(groups);
    renderTaskList(
      ELEMENTS.listaCritico,
      groups["Crítico"],
      "Nenhuma tarefa crítica encontrada."
    );
    renderTaskList(
      ELEMENTS.listaAtencao,
      groups["Atenção"],
      "Nenhuma tarefa em atenção encontrada."
    );
    renderTaskList(
      ELEMENTS.listaTranquilo,
      groups["Tranquilo"],
      "Nenhuma tarefa tranquila encontrada."
    );
  } catch (error) {
    console.error("[filaTrabalho] erro ao carregar tarefas", error);
    showFeedback("Não foi possível carregar a fila de trabalho. Tente novamente.", "warning");
    renderTaskList(
      ELEMENTS.listaCritico,
      [],
      "Não foi possível carregar as tarefas."
    );
    renderTaskList(
      ELEMENTS.listaAtencao,
      [],
      "Não foi possível carregar as tarefas."
    );
    renderTaskList(
      ELEMENTS.listaTranquilo,
      [],
      "Não foi possível carregar as tarefas."
    );
  }
}

function scheduleLoadTasks() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(loadTasks, 300);
}

function bindFilters() {
  ELEMENTS.filtroProcesso?.addEventListener("input", scheduleLoadTasks);
  ELEMENTS.filtroStatus?.addEventListener("change", scheduleLoadTasks);
  ELEMENTS.filtroResponsavel?.addEventListener("change", scheduleLoadTasks);
  ELEMENTS.filtroMinhas?.addEventListener("change", handleMineToggle);
}

document.addEventListener("DOMContentLoaded", () => {
  loadStatusOptions();
  bindFilters();
  loadUsers().finally(loadTasks);
});
