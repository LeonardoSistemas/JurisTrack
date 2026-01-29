const API_URL = '/api/auxiliares/comarcas';
const ID_CAMPO = 'idcomarca';
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
    carregarEstados();
});

// Função para listar as comarcas
async function carregar() {
    const buscaInput = document.getElementById("buscaInput");
    const termo = buscaInput ? buscaInput.value : "";
    const filtroStatus = document.getElementById("filtroStatus");

    try {
        const res = await authFetch(`${API_URL}?busca=${termo}`);

        // Se der erro 500, exibe alerta
        if (!res.ok) {
            const erro = await res.json();
            throw new Error(erro.error || "Erro ao carregar dados");
        }

        let dados = await res.json();

        // Client-side filtering
        if (filtroStatus && filtroStatus.value) {
            const wantActive = filtroStatus.value === 'ativo';
            dados = dados.filter(d => !!d.ativo === wantActive);
        }
        const tbody = document.getElementById("tabelaCorpo");

        tbody.innerHTML = dados.map(item => {
            const statusHtml = item.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-danger">Inativo</span>';

            // CORREÇÃO: Usa 'estados' (plural) e protege contra nulos com '?'
            // O nome da propriedade vem do nome da tabela no banco (estados)
            const nomeEstado = item.estados ? item.estados.descricao : '-';

            return `
            <tr>
                <td>${item.descricao}</td>
                <td>${nomeEstado}</td>
                <td>${statusHtml}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary" 
                        onclick="editar('${item[ID_CAMPO]}', '${item.descricao}', '${item.idestado}', ${item.ativo})">
                        <i class="fas fa-pen"></i>
                    </button>
                    </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error("Erro no frontend:", error);
        document.getElementById("tabelaCorpo").innerHTML =
            `<tr><td colspan="4" class="text-center text-danger">Erro: ${error.message}</td></tr>`;
    }
}

// Carrega o combo de estados no modal
async function carregarEstados() {
    try {
        const res = await authFetch("/api/locais/estados");
        const estados = await res.json();
        const select = document.getElementById("SelectEstado");

        if (select) {
            select.innerHTML = '<option value="">Selecione um Estado...</option>';
            estados.forEach(est => {
                const opt = document.createElement("option");
                opt.value = est.idestado;
                opt.textContent = est.descricao;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar estados:", error);
    }
}

window.abrirModal = () => {
    document.getElementById("IdRegisto").value = "";
    document.getElementById("Descricao").value = "";
    if (document.getElementById("SelectEstado")) document.getElementById("SelectEstado").value = "";

    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = true;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.editar = (id, desc, idEstado, status) => {
    document.getElementById("IdRegisto").value = id;
    document.getElementById("Descricao").value = desc;

    const sel = document.getElementById("SelectEstado");
    // Garante que o valor não seja 'undefined' ou 'null' texto
    if (sel) sel.value = (idEstado && idEstado !== 'undefined' && idEstado !== 'null') ? idEstado : "";

    const isActive = (String(status) === 'true');
    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = isActive;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.salvar = async () => {
    const desc = document.getElementById("Descricao").value;
    const idEstado = document.getElementById("SelectEstado").value;

    const checkAtivo = document.getElementById("Ativo");
    const isAtivo = checkAtivo ? checkAtivo.checked : true;

    if (!desc || !idEstado) return alert("Preencha a descrição e selecione o Estado.");

    const body = {
        descricao: desc,
        idestado: idEstado,
        ativo: isAtivo
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
        alert("Erro de conexão com o servidor.");
    }
};