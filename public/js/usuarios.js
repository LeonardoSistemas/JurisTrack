const API_BASE = "/api/users";

const state = {
  users: [],
};

const els = {
  tabelaBody: document.getElementById("tabelaUsuariosBody"),
  total: document.getElementById("totalUsuarios"),
  alertArea: document.getElementById("alertArea"),
  btnAtualizar: document.getElementById("btnAtualizar"),
  btnNovo: document.getElementById("btnNovoUsuario"),
  modalEl: document.getElementById("usuarioModal"),
  modalTitle: document.getElementById("usuarioModalTitle"),
  usuarioId: document.getElementById("usuarioId"),
  nomeInput: document.getElementById("nomeInput"),
  emailInput: document.getElementById("emailInput"),
  senhaInput: document.getElementById("senhaInput"),
  roleInput: document.getElementById("roleInput"),
  statusInput: document.getElementById("statusInput"),
  salvarBtn: document.getElementById("salvarUsuarioBtn"),
};

const AUTH_TOKEN_KEY = "juristrack_token";
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
  renderTable();
  carregarUsuarios();
});

function bindEvents() {
  els.btnAtualizar?.addEventListener("click", carregarUsuarios);
  els.btnNovo?.addEventListener("click", () => abrirModalCriar());
  els.salvarBtn?.addEventListener("click", salvarUsuario);

  // Wait for component elements
  setTimeout(() => {
    const filtroStatus = document.getElementById("filtroStatus");
    const busca = document.getElementById("buscaInput");

    filtroStatus?.addEventListener("change", carregarUsuarios);
    busca?.addEventListener("input", renderTable);
  }, 100);

  els.tabelaBody?.addEventListener("click", (event) => {
    const actionBtn = event.target.closest("[data-action]");
    if (!actionBtn) return;

    const id = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;
    const user = state.users.find((u) => String(u.id) === String(id));
    if (!user) return;

    if (action === "edit") {
      abrirModalEditar(user);
    } else if (action === "inactivate") {
      confirmarAlteracaoStatus(user, "inactivate");
    } else if (action === "reactivate") {
      confirmarAlteracaoStatus(user, "reactivate");
    }
  });
}

function setTableMessage(text) {
  if (els.tabelaBody) {
    els.tabelaBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${text}</td></tr>`;
  }
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

async function carregarUsuarios() {
  setTableMessage("Carregando usuários...");
  showAlert("info", "Buscando usuários...");

  let url = `${API_BASE}`;

  const filtroStatus = document.getElementById("filtroStatus");
  const status = filtroStatus?.value;
  if (status) {
    url += `?status=${encodeURIComponent(status)}`;
  }

  try {
    const response = await authFetch(url);
    const data = await response.json().catch(() => []);

    if (!response.ok) {
      throw new Error(data?.message || "Erro ao listar usuários.");
    }

    state.users = Array.isArray(data) ? data : [];
    renderTable();
    showAlert("success", `Lista atualizada (${state.users.length})`);
  } catch (error) {
    console.error("[usuarios] erro ao carregar", error);
    state.users = [];
    renderTable();
    showAlert("danger", error.message);
  }
}

function renderTable() {
  if (!els.tabelaBody) return;

  const busca = document.getElementById("buscaInput");
  const termo = (busca?.value || "").toLowerCase().trim();
  const filtrados = state.users.filter((u) => {
    if (!termo) return true;
    return (
      (u.nome || "").toLowerCase().includes(termo) ||
      (u.email || "").toLowerCase().includes(termo) ||
      (u.role || "").toLowerCase().includes(termo)
    );
  });

  if (els.total) {
    els.total.textContent = filtrados.length;
  }

  if (filtrados.length === 0) {
    setTableMessage("Nenhum usuário encontrado com os filtros atuais.");
    return;
  }

  els.tabelaBody.innerHTML = filtrados
    .map((user) => {
      const badgeClass =
        user.status === "ativo" ? "badge-ativo" : "badge-inativo";
      const statusLabel = user.status === "ativo" ? "Ativo" : "Inativo";
      const createdAt = formatDate(user.created_at);

      return `
        <tr>
          <td>${user.nome || "-"}</td>
          <td>${user.email || "-"}</td>
          <td>${user.role || "-"}</td>
          <td class="text-center"><span class="badge ${badgeClass}">${statusLabel}</span></td>
          <td>${createdAt}</td>
          <td class="text-end table-actions">
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${user.id}">
              <i class="fas fa-pen"></i>
            </button>
            ${user.status === "ativo"
          ? `<button class="btn btn-sm btn-outline-danger" data-action="inactivate" data-id="${user.id}">
                    <i class="fas fa-user-slash"></i>
                  </button>`
          : `<button class="btn btn-sm btn-outline-success" data-action="reactivate" data-id="${user.id}">
                    <i class="fas fa-user-check"></i>
                  </button>`
        }
          </td>
        </tr>
      `;
    })
    .join("");
}

function abrirModalCriar() {
  if (!els.modalEl) return;
  els.modalTitle.textContent = "Novo Usuário";
  els.usuarioId.value = "";
  els.nomeInput.removeAttribute("disabled");
  els.nomeInput.value = "";
  els.emailInput.removeAttribute("disabled");
  els.emailInput.value = "";
  els.senhaInput.value = "";
  els.roleInput.value = "advogado";
  els.statusInput.value = "ativo";
  new bootstrap.Modal(els.modalEl).show();
}

function abrirModalEditar(user) {
  if (!els.modalEl) return;
  els.modalTitle.textContent = "Editar Usuário";
  els.usuarioId.value = user.id;
  els.nomeInput.value = user.nome || "";
  els.nomeInput.setAttribute("disabled", "disabled");
  els.emailInput.value = user.email || "";
  els.emailInput.setAttribute("disabled", "disabled");
  els.senhaInput.value = "";
  els.roleInput.value = user.role || "advogado";
  els.statusInput.value = user.status || "ativo";

  new bootstrap.Modal(els.modalEl).show();
}

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

async function salvarUsuario() {
  const id = (els.usuarioId?.value || "").trim();
  const nome = (els.nomeInput?.value || "").trim();
  const email = (els.emailInput?.value || "").trim().toLowerCase();
  const senha = els.senhaInput?.value || "";
  const role = els.roleInput?.value || "";
  const status = els.statusInput?.value || "";

  if (!nome) {
    showAlert("warning", "O nome é obrigatório.");
    return;
  }

  if (!id && !validarEmail(email)) {
    showAlert("warning", "Informe um e-mail válido.");
    return;
  }

  if (!role) {
    showAlert("warning", "Role é obrigatória.");
    return;
  }

  if (!status) {
    showAlert("warning", "Status é obrigatório.");
    return;
  }

  if (!id && (!senha || senha.length < 6)) {
    showAlert("warning", "Senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (id && senha && senha.length < 6) {
    showAlert("warning", "Senha deve ter pelo menos 6 caracteres.");
    return;
  }

  const payload = {};
  let method = "POST";
  let url = API_BASE;

  if (id) {
    method = "PATCH";
    url = `${API_BASE}/${id}`;

    payload.nome = nome;
    payload.role = role;
    payload.status = status;

    if (senha) {
      payload.password = senha;
    }
  } else {
    payload.nome = nome;
    payload.email = email;
    payload.password = senha;
    payload.role = role;
    payload.status = status;
  }

  try {
    const response = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || "Erro ao salvar usuário.");
    }

    bootstrap.Modal.getInstance(els.modalEl)?.hide();
    showAlert("success", data?.message || "Usuário salvo com sucesso.");
    carregarUsuarios();
  } catch (error) {
    console.error("[usuarios] erro ao salvar", error);
    showAlert("danger", error.message);
  }
}

function confirmarAlteracaoStatus(user, action) {
  const actionLabel = action === "inactivate" ? "inativar" : "reativar";
  const confirmacao = window.confirm(
    `Deseja ${actionLabel} o usuário ${user.email}?`
  );
  if (!confirmacao) return;
  alterarStatus(user.id, action);
}

async function alterarStatus(id, action) {
  const endpoint =
    action === "inactivate"
      ? `${API_BASE}/${id}/inactivate`
      : `${API_BASE}/${id}/reactivate`;

  try {
    const response = await authFetch(endpoint, { method: "POST" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || "Erro ao alterar status.");
    }

    showAlert("success", data?.message || "Status atualizado com sucesso.");
    carregarUsuarios();
  } catch (error) {
    console.error("[usuarios] erro status", error);
    showAlert("danger", error.message);
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

