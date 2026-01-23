const API_URL = '/api/auxiliares/moedas';
const ID_CAMPO = 'idmoeda';
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
    // Tenta encontrar o input imediatamente ou aguarda o componente
    setTimeout(() => {
        const buscaInput = document.getElementById("buscaInput");
        if (buscaInput) {
            buscaInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") carregar();
            });
        }

        const filtroStatus = document.getElementById("filtroStatus");
        if (filtroStatus) {
            filtroStatus.addEventListener("change", carregar);
        }
    }, 100);

    carregar();
});

async function carregar() {
    try {
        const buscaInput = document.getElementById("buscaInput");
        const termo = buscaInput ? buscaInput.value : "";
        const filtroStatus = document.getElementById("filtroStatus");

        const res = await authFetch(`${API_URL}?busca=${termo}`);
        let dados = await res.json();

        // Client-side filtering
        if (filtroStatus && filtroStatus.value) {
            const wantActive = filtroStatus.value === 'ativo';
            dados = dados.filter(d => !!d.ativo === wantActive);
        }

        const tbody = document.getElementById("tabelaCorpo");

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma Moeda cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = dados.map(item => {
            const statusHtml = item.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-danger">Inativo</span>';

            const idMoedaReal = item.idmoeda || item.IdMoeda || item.idMoeda;

            // Tratamento para evitar erro caso simbolo venha null
            const simboloSafe = item.simbolo || '';

            // CORREÇÃO: Passando o símbolo para a função editar
            return `
            <tr>
                <td>${item.descricao}</td>
                <td>${simboloSafe}</td>
                <td>${statusHtml}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary" 
                        onclick="editar('${idMoedaReal}', '${item.descricao}', '${simboloSafe}', ${item.ativo})">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

window.abrirModal = () => {
    document.getElementById("IdRegisto").value = "";
    document.getElementById("Descricao").value = "";
    // CORREÇÃO: Limpar campo Símbolo
    document.getElementById("Simbolo").value = "";

    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = true;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

// CORREÇÃO: Adicionado parâmetro 'simbolo' na função
window.editar = (id, desc, simbolo, status) => {
    document.getElementById("IdRegisto").value = id;
    document.getElementById("Descricao").value = desc;
    // CORREÇÃO: Preencher campo Símbolo
    document.getElementById("Simbolo").value = simbolo;

    // Converte para boolean corretamente (string 'true' vira true)
    const isActive = (String(status) === 'true');
    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = isActive;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.salvar = async () => {
    const desc = document.getElementById("Descricao").value;
    // Agora esta linha funciona pois o HTML tem o ID "Simbolo"
    const sim = document.getElementById("Simbolo").value;
    const checkAtivo = document.getElementById("Ativo");

    if (!desc) return alert("A descrição é obrigatória.");
    if (!sim) return alert("O símbolo é obrigatório."); // Validação extra

    const body = {
        descricao: desc,
        simbolo: sim, // CORREÇÃO: Incluído no payload para a API
        ativo: checkAtivo ? checkAtivo.checked : true
    };

    const id = document.getElementById("IdRegisto").value;

    if (id) body[ID_CAMPO] = id;

    try {
        const res = await authFetch(API_URL, {
            method: 'POST', // Certifique-se que sua API aceita POST para criar e editar (ou ajuste a lógica)
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            // Fecha o modal corretamente
            const modalEl = document.getElementById("modalAuxiliar");
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();

            carregar();
        } else {
            const erro = await res.json();
            alert("Erro ao salvar: " + (erro.error || erro.message || "Desconhecido"));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
};