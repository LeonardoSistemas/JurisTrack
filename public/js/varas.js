const API_URL = '/api/auxiliares/varas';
// Tenta ler o ID da vara de várias formas para evitar erro
const ID_CAMPO_PREF = 'idvara';

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
    carregarCombos();
});

// Lista as Varas
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

        // LOG PARA DEBUG: Veja no console (F12) como os dados estão chegando
        console.log("Dados recebidos da API (Varas):", dados);

        const tbody = document.getElementById("tabelaCorpo");

        tbody.innerHTML = dados.map(item => {
            const statusHtml = item.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-danger">Inativo</span>';

            const nomeTribunal = item.tribunais ? item.tribunais.descricao : '-';

            // BLINDAGEM 1: Lê o ID do Tribunal independente da maiúscula/minúscula
            const idTribunalReal = item.idtribunal || item.IdTribunal || item.idTribunal || '';

            // BLINDAGEM 2: Lê o ID da Vara
            const idVaraReal = item.idvara || item.IdVara || item.idVara;

            return `
            <tr>
                <td>${item.descricao}</td>
                <td>${nomeTribunal}</td>
                <td>${statusHtml}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary" 
                        onclick="editar('${idVaraReal}', '${item.descricao}', '${idTribunalReal}', ${item.ativo})">
                        <i class="fas fa-pen"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

// Carrega o Combo de Tribunais
async function carregarCombos() {
    try {
        const resTribunal = await authFetch("/api/auxiliares/tribunais");
        const tribunais = await resTribunal.json();

        // LOG PARA DEBUG
        console.log("Dados recebidos da API (Tribunais):", tribunais);

        const selTribunal = document.getElementById("SelectTribunal");

        if (selTribunal) {
            selTribunal.innerHTML = '<option value="">Selecione...</option>';
            tribunais.forEach(t => {
                const opt = document.createElement("option");
                // BLINDAGEM 3: Garante que o value do option use o ID correto
                const idTribunal = t.idtribunal || t.IdTribunal || t.idTribunal;

                if (idTribunal) {
                    opt.value = idTribunal;
                    opt.textContent = t.descricao;
                    selTribunal.appendChild(opt);
                } else {
                    console.warn("Tribunal sem ID encontrado:", t);
                }
            });
        }
    } catch (error) {
        console.error("Erro ao carregar combos:", error);
    }
}

window.abrirModal = () => {
    document.getElementById("IdRegisto").value = "";
    document.getElementById("Descricao").value = "";
    if (document.getElementById("SelectTribunal")) document.getElementById("SelectTribunal").value = "";

    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = true;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.editar = (id, desc, idtribunal, status) => {
    console.log("Editando Vara:", { id, desc, idtribunal, status }); // Debug

    document.getElementById("IdRegisto").value = id;
    document.getElementById("Descricao").value = desc;

    // Tenta selecionar o tribunal no combo
    const selTribunal = document.getElementById("SelectTribunal");
    if (selTribunal) {
        // Converte para string para evitar erros de tipo e remove 'null' texto
        let valorParaSetar = "";
        if (idtribunal && idtribunal !== 'null' && idtribunal !== 'undefined') {
            valorParaSetar = String(idtribunal);
        }

        selTribunal.value = valorParaSetar;

        // Verifica se funcionou
        if (selTribunal.value === "" && valorParaSetar !== "") {
            console.warn(`Atenção: O ID do tribunal (${valorParaSetar}) não foi encontrado na lista do Select.`);
        }
    }

    const isActive = (String(status) === 'true');
    const checkAtivo = document.getElementById("Ativo");
    if (checkAtivo) checkAtivo.checked = isActive;

    new bootstrap.Modal(document.getElementById("modalAuxiliar")).show();
};

window.salvar = async () => {
    const desc = document.getElementById("Descricao").value;
    const idTribunalValor = document.getElementById("SelectTribunal").value;
    const checkAtivo = document.getElementById("Ativo");

    if (!desc) return alert("A descrição é obrigatória.");

    // Envia 'idtribunal' (minúsculo) que costuma ser o padrão mais seguro
    const body = {
        descricao: desc,
        idtribunal: idTribunalValor || null,
        ativo: checkAtivo ? checkAtivo.checked : true
    };

    const id = document.getElementById("IdRegisto").value;

    // Usa a chave 'idvara' para edição (padrão minúsculo)
    if (id) body['idvara'] = id;

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