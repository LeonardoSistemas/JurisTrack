const API_URL = '/api/auxiliares/esferas';
const ID_CAMPO = 'idesfera';
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
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhuma esfera cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = dados.map(item => {
            const statusHtml = item.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-danger">Inativo</span>';

            const idEsferaReal = item.idesfera || item.IdEsfera || item.idEsfera;

            return `
            <tr>
                <td>${item.descricao}</td>
                <td>${statusHtml}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary" 
                        onclick="editar('${idEsferaReal}', '${item.descricao}', ${item.ativo})">
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


    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = true;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.editar = (id, desc, status) => {
    document.getElementById("IdRegisto").value = id;
    document.getElementById("Descricao").value = desc;

    const isActive = (String(status) === 'true');
    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = isActive;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.salvar = async () => {
    const desc = document.getElementById("Descricao").value;
    const checkAtivo = document.getElementById("Ativo");

    if (!desc) return alert("A descrição é obrigatória.");


    const body = {
        descricao: desc,
        ativo: checkAtivo ? checkAtivo.checked : true
    };

    const id = document.getElementById("IdRegisto").value;


    if (id) body[ID_CAMPO] = id;

    try {
        const res = await authFetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById("modalAuxiliar")).hide();
            carregar();
        } else {
            const erro = await res.json();
            alert("Erro ao salvar: " + (erro.error || "Desconhecido"));
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
};