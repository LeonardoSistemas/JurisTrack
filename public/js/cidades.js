// Ajuste para encontrar o input gerado pelo componente
document.addEventListener("DOMContentLoaded", () => {
    carregarCidades();
    carregarComboEstados(); // Carrega os estados para o modal

    // Tenta encontrar o input imediatamente ou aguarda o componente
    setTimeout(() => {
        const buscaInput = document.getElementById("buscaInput");
        if (buscaInput) {
            buscaInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") carregarCidades();
            });
        }

        const filtroStatus = document.getElementById("filtroStatus");
        if (filtroStatus) {
            filtroStatus.addEventListener("change", carregarCidades);
        }
    }, 100);
});

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

// Função para listar as cidades na tabela
async function carregarCidades() {
    const buscaInput = document.getElementById("buscaInput");
    const termo = buscaInput ? buscaInput.value : "";

    // Status Filter
    const filtroStatus = document.getElementById("filtroStatus");

    const tbody = document.getElementById("tabelaCorpo");
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';

    try {
        const res = await authFetch(`/api/locais/cidades?busca=${termo}`);
        let dados = await res.json();

        // Client-side filtering for status
        if (filtroStatus && filtroStatus.value) {
            const wantActive = filtroStatus.value === 'ativo';
            dados = dados.filter(c => !!c.ativo === wantActive);
        }

        tbody.innerHTML = "";

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma cidade encontrada.</td></tr>';
            return;
        }

        dados.forEach(cidade => {
            const nomeEstado = cidade.estados ? cidade.estados.descricao : "-";
            const ufEstado = cidade.estados ? cidade.estados.uf : "-";

            // Lógica visual do Badge
            const statusHtml = cidade.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-danger">Inativo</span>';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${cidade.descricao}</td>
                <td>${nomeEstado}</td>
                <td><span class="badge bg-light text-dark border me-1">${ufEstado}</span></td>
                <td>${statusHtml}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary me-1" 
                        onclick="editar('${cidade.idcidade}', '${cidade.descricao}', '${cidade.idestado}', ${cidade.ativo})">
                        <i class="fas fa-pen"></i>
                    </button>
                    </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
    }
}

// Carrega o Select de Estados dentro do Modal
async function carregarComboEstados() {
    try {
        const res = await authFetch("/api/locais/estados");
        const estados = await res.json();
        const select = document.getElementById("IdEstado");
        const selectUF = document.getElementById("idUF"); // Se existir campo UF na tela

        // Limpa e preenche
        if (select) select.innerHTML = '<option value="">Selecione...</option>';
        if (selectUF) selectUF.innerHTML = '<option value="">Selecione...</option>';

        estados.forEach(est => {
            // Preenche Combo de Estado
            if (select) {
                const opt = document.createElement("option");
                opt.value = est.idestado;
                opt.textContent = est.descricao;
                select.appendChild(opt);
            }

            // Preenche Combo de UF (se existir na tela para visualização)
            if (selectUF) {
                const optUf = document.createElement("option");
                optUf.value = est.idestado; // Mantém mesmo ID para sincronia
                optUf.textContent = est.uf;
                selectUF.appendChild(optUf);
            }
        });
    } catch (error) {
        console.error("Erro ao carregar combo de estados", error);
    }
}

// [NOVO] Função para abrir o modal de criação (Botão "Nova Cidade")
window.abrirModal = function () {
    document.getElementById("IdCidade").value = "";
    document.getElementById("Descricao").value = "";
    document.getElementById("IdEstado").value = "";

    // Define como Ativo por padrão ao criar novo
    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = true;

    // Se houver campo de UF, reseta também
    if (document.getElementById("idUF")) document.getElementById("idUF").value = "";

    new bootstrap.Modal(document.getElementById("modalCidade")).show();
};

// Função para abrir o modal de edição
window.editar = function (id, nome, idestado, status) {
    document.getElementById("IdCidade").value = id;
    document.getElementById("Descricao").value = nome;
    document.getElementById("IdEstado").value = idestado;

    // Sincroniza o campo UF se existir
    if (document.getElementById("idUF")) {
        document.getElementById("idUF").value = idestado;
    }

    // Converte status para booleano corretamente e marca o checkbox
    const isActive = (String(status) === 'true');
    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = isActive;

    // CORREÇÃO: Chama o modal correto "modalCidade"
    new bootstrap.Modal(document.getElementById("modalCidade")).show();
};

// Salvar (Criar ou Editar)
window.salvar = async function () {
    const id = document.getElementById("IdCidade").value;
    const descricao = document.getElementById("Descricao").value;
    const idestado = document.getElementById("IdEstado").value;
    const checkAtivo = document.getElementById("Ativo");

    if (!descricao) return alert("Preencha o nome da cidade.");
    if (!idestado) return alert("Selecione um Estado.");

    const body = {
        idcidade: id || null,
        descricao: descricao,
        idestado: idestado,
        ativo: checkAtivo ? checkAtivo.checked : true // Padrão true se não houver checkbox
    };

    try {
        const res = await authFetch("/api/locais/cidades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            // Fecha o modal corretamente
            const modalEl = document.getElementById("modalCidade");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            carregarCidades();
        } else {
            const erro = await res.json();
            alert("Erro ao salvar: " + (erro.error || "Desconhecido"));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
};

// Deletar
window.deletar = async function (id) {
    if (!confirm("Deseja realmente excluir esta cidade?")) return;
    try {
        const res = await authFetch(`/api/locais/cidades/${id}`, { method: "DELETE" });
        if (res.ok) {
            carregarCidades();
        } else {
            alert("Erro ao deletar. Verifique se não há processos vinculados.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao deletar");
    }
};

// Sincronizar Combos (Opcional: Ao mudar Estado, muda UF e vice-versa)
const selEstado = document.getElementById("IdEstado");
const selUF = document.getElementById("idUF");

if (selEstado && selUF) {
    selEstado.addEventListener("change", () => selUF.value = selEstado.value);
    selUF.addEventListener("change", () => selEstado.value = selUF.value);
}