// Variável global para armazenar as publicações carregadas
let cachePublicacoes = [];
let partesProcesso = [];
let listaPessoasCache = [];

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

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Carrega Combos
    await Promise.all([
        carregarSelect("/api/locais/estados", "selectEstado"),
        carregarSelect("/api/auxiliares/comarcas", "IdComarca"),
        carregarSelect("/api/auxiliares/tribunais", "IdTribunal"),
        carregarSelect("/api/auxiliares/varas", "IdVara"),
        carregarSelect("/api/auxiliares/decisoes", "IdDecisao"),
        carregarSelect("/api/auxiliares/tipos_acao", "id_tipo_acao"),
        carregarSelect("/api/auxiliares/ritos", "id_rito"),
        carregarSelect("/api/auxiliares/esferas", "id_esfera"),
        carregarSelect("/api/auxiliares/fases", "id_fase"),
        carregarSelect("/api/auxiliares/situacoes", "id_situacao"),
        carregarSelect("/api/auxiliares/probabilidades", "id_probabilidade"),
        carregarSelect("/api/auxiliares/moedas", "id_moeda"),
        carregarUsuariosResponsaveis(),
        carregarPessoas()
    ]);

    // 2. Verifica ID na URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const modo = params.get("modo");

    configurarUpload();

    if (id) {
        document.getElementById("btnExcluir").style.display = "inline-block";
        document.getElementById("headerTitulo").textContent = "Editar Processo";
        await carregarDadosProcesso(id);

        if (modo === 'leitura') {
            bloquearEdicao();
        }
    } else {
        renderizarTabelaPartes();
    }
});

const selectEstado = document.getElementById("selectEstado");
if (selectEstado) {
    selectEstado.addEventListener("change", (e) => {
        carregarCidadesPorEstado(e.target.value);
    });
}

// --- FUNÇÕES DE CARREGAMENTO ---

async function carregarPessoas() {
    try {
        const res = await authFetch("/api/pessoas");
        listaPessoasCache = await res.json();
        const selectAdv = document.getElementById('id_advogado');
        if (selectAdv) {
            selectAdv.innerHTML = '<option value="">Selecione...</option>';
            listaPessoasCache.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.idpessoa || p.id;
                opt.textContent = p.nome;
                selectAdv.appendChild(opt);
            });
        }
    } catch (e) { console.error("Erro ao carregar pessoas", e); }
}

async function carregarSelect(url, elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;
    try {
        const res = await authFetch(url);
        const lista = await res.json();
        select.innerHTML = '<option value="">Selecione...</option>';
        lista.forEach(item => {
            const id = item.id || item.idvara || item.idcomarca || item.idtribunal || item.idestado || item.idcidade || item.idtipoacao || item.idrito || item.idesfera || item.idfase || item.idsituacao || item.idprobabilidade || item.idmoeda || item.iddecisao;
            const idFinal = id || Object.values(item).find(v => typeof v !== 'object');
            const texto = item.descricao || item.nome;
            const opt = document.createElement("option");
            opt.value = idFinal;
            opt.textContent = texto;
            select.appendChild(opt);
        });
    } catch (error) { console.error(`Erro ao carregar ${elementId}`, error); }
}

async function carregarCidadesPorEstado(idEstado, cidadeId = null) {
    const sel = document.getElementById("IdCidade");
    if (!idEstado) { sel.innerHTML = '<option value="">Selecione Estado...</option>'; return; }
    try {
        const res = await authFetch(`/api/locais/cidades?idEstado=${idEstado}`);
        const listaTotal = await res.json();
        const lista = listaTotal.filter(c => c.idestado === idEstado);
        sel.innerHTML = '<option value="">Selecione...</option>';
        lista.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.idcidade;
            opt.textContent = c.descricao;
            sel.appendChild(opt);
        });
        if (cidadeId) sel.value = cidadeId;
    } catch (e) { console.error("Erro ao carregar cidades", e); }
}

async function carregarDadosProcesso(id) {
    try {
        const res = await authFetch(`/api/processos/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar processo");
        const proc = await res.json();

        document.getElementById("headerNumProcesso").textContent = proc.numprocesso || "Sem Número";
        document.getElementById("IdProcesso").value = proc.idprocesso;
        document.getElementById("NumProcesso").value = proc.numprocesso || "";
        document.getElementById("ClasseProcessual").value = proc.classe_processual || "";
        document.getElementById("Assunto").value = proc.assunto || "";
        document.getElementById("ValorCausa").value = proc.valor_causa || "";
        document.getElementById("Obs").value = proc.obs || "";

        const setVal = (eid, val) => { const el = document.getElementById(eid); if (el) el.value = val || ""; };
        setVal("id_tipo_acao", proc.idtipoacao);
        setVal("id_rito", proc.idrito);
        setVal("id_esfera", proc.idesfera);
        setVal("id_fase", proc.idfase);
        setVal("id_situacao", proc.idsituacao);
        setVal("id_probabilidade", proc.idprobabilidade);
        setVal("id_moeda", proc.idmoeda);
        setVal("IdComarca", proc.idcomarca);
        setVal("IdVara", proc.idvara);
        setVal("id_advogado", proc.idadvogado);

        partesProcesso = [];
        if (proc.partes && Array.isArray(proc.partes)) {
            partesProcesso = proc.partes.map(p => ({
                tipo: p.tipo_parte,
                idpessoa: p.pessoas.idpessoa,
                nome: p.pessoas.nome,
                cpf: p.pessoas.cpf_cnpj
            }));
        }
        renderizarTabelaPartes();

        if (proc.data_distribuicao) document.getElementById("DataDistribuicao").value = proc.data_distribuicao.split("T")[0];

        if (proc.cidades && proc.cidades.idestado) {
            const elEstado = document.getElementById("selectEstado");
            if (elEstado) {
                elEstado.value = proc.cidades.idestado;
                await carregarCidadesPorEstado(proc.cidades.idestado, proc.idcidade);
            }
        } else if (proc.idcidade) { setVal("IdCidade", proc.idcidade); }

        cachePublicacoes = proc.Publicacao || [];
        renderizarPrazos(proc);
        renderizarAndamentos(proc);
        await carregarDocumentosDoProcesso(id);

    } catch (error) {
        console.error(error);
        alert("Erro ao carregar dados do processo.");
    }
}

function renderizarTabelaPartes() {
    const tbody = document.getElementById("tabelaPartesBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    partesProcesso.forEach((parte, index) => {
        const tr = document.createElement("tr");

        // Coluna Tipo
        const tdTipo = document.createElement("td");
        const selTipo = document.createElement("select");
        selTipo.className = "form-select form-select-sm";
        selTipo.innerHTML = `<option value="Autor">Autor</option><option value="Réu">Réu</option>`;
        selTipo.value = parte.tipo || 'Autor';
        selTipo.onchange = (e) => { partesProcesso[index].tipo = e.target.value; };
        tdTipo.appendChild(selTipo);

        // Coluna Nome com Tom Select
        const tdNome = document.createElement("td");
        const selPessoa = document.createElement("select");
        selPessoa.className = "select-pessoa-busca"; // Classe para o Tom Select
        selPessoa.appendChild(new Option("Selecione...", ""));
        
        listaPessoasCache.forEach(p => {
            selPessoa.appendChild(new Option(p.nome, p.idpessoa));
        });
        
        selPessoa.value = parte.idpessoa || "";
        tdNome.appendChild(selPessoa);

        // Coluna CPF (Input que será atualizado via JS)
        const tdCpf = document.createElement("td");
        const inputCpf = document.createElement("input");
        inputCpf.type = "text";
        inputCpf.id = `cpf-input-${index}`; // ID único para atualização rápida
        inputCpf.className = "form-control form-control-sm bg-light";
        inputCpf.readOnly = true;
        inputCpf.value = parte.cpf || "";
        tdCpf.appendChild(inputCpf);

        // Coluna Ações
        const tdAcoes = document.createElement("td");
        tdAcoes.className = "text-end";
        tdAcoes.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerLinhaParte(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;

        tr.appendChild(tdTipo);
        tr.appendChild(tdNome);
        tr.appendChild(tdCpf);
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);

        // INICIALIZAÇÃO DO TOM SELECT SEM RESETAR A TABELA
        setTimeout(() => {
            if (typeof TomSelect !== "undefined") {
                new TomSelect(selPessoa, {
                    create: false,
                    maxOptions: 100,
                    placeholder: "Digite o nome...",
                    allowEmptyOption: true,
                    maxOptions: 100, // Limita opções visíveis para melhorar performance
                    onChange: (val) => {
                        // Atualiza os dados silenciosamente sem disparar renderizarTabelaPartes()
                        atualizarParteSilencioso(index, val);
                    }
                });
            }
        }, 10);
    });

    if (partesProcesso.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhuma parte adicionada.</td></tr>';
    }
}

// --- ATUALIZAÇÃO SILENCIOSA (Evita travamentos) ---
function atualizarParteSilencioso(index, idpessoa) {
    const pessoa = listaPessoasCache.find(p => p.idpessoa == idpessoa);
    const inputCpf = document.getElementById(`cpf-input-${index}`);

    if (pessoa) {
        partesProcesso[index].idpessoa = pessoa.idpessoa;
        partesProcesso[index].nome = pessoa.nome;
        partesProcesso[index].cpf = pessoa.cpf_cnpj;
        if (inputCpf) inputCpf.value = pessoa.cpf_cnpj; // Atualiza apenas o campo CPF no DOM
    } else {
        partesProcesso[index].idpessoa = "";
        partesProcesso[index].nome = "";
        partesProcesso[index].cpf = "";
        if (inputCpf) inputCpf.value = "";
    }
}

window.adicionarLinhaParte = function () {
    partesProcesso.push({ tipo: 'Autor', idpessoa: '', nome: '', cpf: '' });
    renderizarTabelaPartes();
};

window.removerLinhaParte = function (index) {
    partesProcesso.splice(index, 1);
    renderizarTabelaPartes();
};

function atualizarParte(index, idpessoa) {
    const pessoa = listaPessoasCache.find(p => p.idpessoa == idpessoa);
    if (pessoa) {
        partesProcesso[index].idpessoa = pessoa.idpessoa;
        partesProcesso[index].nome = pessoa.nome;
        partesProcesso[index].cpf = pessoa.cpf_cnpj;
    } else {
        partesProcesso[index].idpessoa = "";
        partesProcesso[index].nome = "";
        partesProcesso[index].cpf = "";
    }
    renderizarTabelaPartes();
}

window.abrirModalPessoa = async function (modo, id = null) {
    const modal = new bootstrap.Modal(document.getElementById("modalGerenciarPessoa"));
    const form = document.getElementById("formPessoa");
    form.reset();
    document.getElementById("modalPessoaId").value = "";

    if (modo === 'Editar' && id) {
        document.getElementById("modalPessoaTitle").textContent = "Editar Parte";
        try {
            const res = await authFetch(`/api/pessoas/${id}`);
            if (res.ok) {
                const p = await res.json();
                document.getElementById("modalPessoaId").value = p.idpessoa;
                document.getElementById("modalPessoaNome").value = p.nome;
                document.getElementById("modalPessoaCPF").value = p.cpf_cnpj || "";
                document.getElementById("modalPessoaEmail").value = p.email || "";
                document.getElementById("modalPessoaTelefone").value = p.telefone || "";
            }
        } catch (e) { console.error("Erro ao carregar pessoa", e); }
    } else {
        document.getElementById("modalPessoaTitle").textContent = "Adicionar Nova Parte";
    }

    modal.show();
};

window.salvarPessoaModal = async function () {
    const id = document.getElementById("modalPessoaId").value;
    const nome = document.getElementById("modalPessoaNome").value;
    const cpf = document.getElementById("modalPessoaCPF").value;
    const email = document.getElementById("modalPessoaEmail").value;
    const telefone = document.getElementById("modalPessoaTelefone").value;

    if (!nome) return alert("Nome é obrigatório");

    const body = { nome, cpf_cnpj: cpf, email, telefone };
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/pessoas/${id}` : "/api/pessoas";

    try {
        const res = await authFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            alert("Pessoa salva com sucesso!");
            bootstrap.Modal.getInstance(document.getElementById("modalGerenciarPessoa")).hide();
            await carregarPessoas();
        } else {
            alert("Erro ao salvar pessoa.");
        }
    } catch (e) { alert("Erro de conexão"); }
};

window.salvarProcesso = async function () {
    const id = document.getElementById("IdProcesso").value;
    const val = (eid) => { const el = document.getElementById(eid); return el ? el.value : null; };

    const partesEnviar = partesProcesso
        .filter(p => p.idpessoa && p.tipo)
        .map(p => ({ idpessoa: p.idpessoa, tipo: p.tipo }));

    const body = {
        numprocesso: val("NumProcesso"),
        classe_processual: val("ClasseProcessual"),
        assunto: val("Assunto"),
        valor_causa: val("ValorCausa") ? parseFloat(val("ValorCausa").replace(",", ".")) : null,
        data_distribuicao: val("DataDistribuicao"),
        obs: val("Obs"),
        idtipoacao: val("id_tipo_acao"),
        idrito: val("id_rito"),
        idesfera: val("id_esfera"),
        idfase: val("id_fase"),
        idsituacao: val("id_situacao"),
        idprobabilidade: val("id_probabilidade"),
        idmoeda: val("id_moeda"),
        idcomarca: val("IdComarca"),
        idvara: val("IdVara"),
        idcidade: val("IdCidade"),
        idadvogado: val("id_advogado"),
        partes: partesEnviar
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `/api/processos/${id}` : "/api/processos";

    try {
        const res = await authFetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            const data = await res.json();
            alert("Processo salvo com sucesso!");
            if (!id) window.location.href = `/html/fichaProcesso.html?id=${data.idprocesso || data[0]?.idprocesso}`;
            else window.location.reload();
        } else {
            const err = await res.json();
            alert("Erro ao salvar: " + (err.error || "Desconhecido"));
        }
    } catch (e) { alert("Erro de conexão"); console.error(e); }
};

window.excluirProcesso = async function () {
    if (!confirm("Tem certeza que deseja excluir este processo?")) return;
    const id = document.getElementById("IdProcesso").value;
    try {
        const res = await authFetch(`/api/processos/${id}`, { method: "DELETE" });
        if (res.ok) {
            alert("Processo excluído.");
            window.location.href = "/processos";
        } else {
            alert("Erro ao excluir.");
        }
    } catch (e) { console.error(e); }
};

function renderizarPrazos(proc) {
    const tbody = document.querySelector("#tab-prazos tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const prazosEncontrados = [];

    if (proc.Publicacao && Array.isArray(proc.Publicacao)) {
        proc.Publicacao.forEach(pub => {
            let listaPrazos = [];
            if (Array.isArray(pub.Prazo)) {
                listaPrazos = pub.Prazo;
            } else if (pub.Prazo) {
                listaPrazos = [pub.Prazo];
            }

            if (listaPrazos.length > 0) {
                listaPrazos.forEach(prazo => {
                    let nomeResponsavel = "Sistema";
                    if (prazo.responsavel && prazo.responsavel.nome) {
                        nomeResponsavel = prazo.responsavel.nome;
                    }
                    prazosEncontrados.push({ ...prazo, responsavel: nomeResponsavel });
                });
            }
        });
    }

    if (prazosEncontrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum prazo cadastrado</td></tr>';
        return;
    }
    prazosEncontrados.sort((a, b) => new Date(a.data_limite) - new Date(b.data_limite));
    prazosEncontrados.forEach(p => {
        let dataVenc = 'Sem data';
        if (p.data_limite) {
            if (p.data_limite.includes('T')) {
                dataVenc = new Date(p.data_limite).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            } else {
                const [ano, mes, dia] = p.data_limite.split('-');
                dataVenc = `${dia}/${mes}/${ano}`;
            }
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let dataLimiteObj = null;
        if (p.data_limite) {
            const [ano, mes, dia] = p.data_limite.split('T')[0].split('-');
            dataLimiteObj = new Date(ano, mes - 1, dia);
        }

        let statusBadge = '<span class="badge bg-secondary">Pendente</span>';
        if (dataLimiteObj && dataLimiteObj < hoje) {
            statusBadge = '<span class="badge bg-danger">Vencido</span>';
        } else if (dataLimiteObj) {
            statusBadge = '<span class="badge bg-warning text-dark">Em Aberto</span>';
        }

        let respHtml = p.responsavel === "Sistema" ? `<span class="badge bg-light text-dark border">Sistema</span>` : `<span class="badge bg-info text-dark">${p.responsavel}</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${p.descricao || "Prazo processual"}</td><td class="fw-bold">${dataVenc}</td><td>${respHtml}</td><td>${statusBadge}</td><td class="text-end"><button type="button" class="btn btn-sm btn-outline-primary" onclick="verPublicacao('${p.publicacaoid}')"><i class="fas fa-eye"></i></button></td>`;
        tbody.appendChild(tr);
    });
}

function renderizarAndamentos(proc) {
    const tabAndamentos = document.getElementById("tab-andamentos");
    if (!tabAndamentos) return;

    tabAndamentos.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 mt-3">
            <h5 class="mb-0">Histórico de Movimentações</h5>
            <div>
                 <button type="button" class="btn btn-primary btn-sm me-2 m-2" onclick="irParaGerarPeticao()">
                    <i class="fas fa-file-signature"></i> Nova Petição
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm m-2" onclick="abrirModalAndamento()">
                    <i class="fas fa-plus"></i> Novo Andamento
                </button>
            </div>
        </div>
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Responsável</th>
                        <th>Tipo</th>
                    </tr>
                </thead>
                <tbody id="tabelaAndamentosBody"></tbody>
            </table>
        </div>
        <div class="modal fade" id="modalNovoAndamento" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header"><h5 class="modal-title">Novo Andamento Manual</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body">
                        <form id="formAndamentoManual">
                            <div class="mb-3"><label class="form-label">Data</label><input type="date" id="dataAndamentoManual" class="form-control" required></div>
                            <div class="mb-3"><label class="form-label">Descrição</label><textarea id="descAndamentoManual" class="form-control" rows="3" required></textarea></div>
                            <div class="mb-3"><label class="form-label">Responsável</label><select id="respAndamentoManual" class="form-select"><option value="">Selecione...</option></select></div>
                        </form>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" onclick="salvarAndamentoManual()">Salvar</button></div>
                </div>
            </div>
        </div>
    `;

    const tbody = document.getElementById("tabelaAndamentosBody");
    let listaEventos = [];

    if (proc.Publicacao) {
        proc.Publicacao.forEach(pub => {
            if (pub.Andamento) {
                pub.Andamento.forEach(and => {
                    listaEventos.push({
                        data: and.data_evento || pub.data_publicacao,
                        descricao: and.descricao || "Publicação recebida",
                        responsavel: "Sistema",
                        tipo: "Publicação"
                    });
                });
            }
            if (pub.Historico_Peticoes) {
                pub.Historico_Peticoes.forEach(pet => {
                    listaEventos.push({
                        data: pet.created_at || pub.data_publicacao,
                        descricao: `Petição Gerada: ${pet.modelo_utilizado || "Documento"}`,
                        responsavel: "Sistema",
                        tipo: "Petição"
                    });
                });
            }
        });
    }

    if (proc.Andamento && Array.isArray(proc.Andamento)) {
        proc.Andamento.forEach(and => {
            if (and.publicacaoid) return;
            let nomeResponsavel = "Usuário";
            if (and.responsavel && and.responsavel.nome) {
                nomeResponsavel = and.responsavel.nome;
            }
            listaEventos.push({
                data: and.data_evento || and.created_at,
                descricao: and.descricao,
                responsavel: nomeResponsavel,
                tipo: "Manual"
            });
        });
    }

    if (listaEventos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum andamento encontrado.</td></tr>';
    } else {
        listaEventos.sort((a, b) => new Date(b.data) - new Date(a.data));
        listaEventos.forEach(evt => {
            const dataFmt = evt.data ? new Date(evt.data).toLocaleDateString('pt-BR') : "-";
            let badgeResp = `<span class="badge bg-secondary">${evt.responsavel}</span>`;
            if (evt.responsavel !== "Sistema") badgeResp = `<span class="badge bg-info text-dark">${evt.responsavel}</span>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${dataFmt}</td><td>${evt.descricao}</td><td>${badgeResp}</td><td><small class="text-muted">${evt.tipo}</small></td>`;
            tbody.appendChild(tr);
        });
    }
}

window.abrirModalAndamento = function () {
    document.getElementById("dataAndamentoManual").valueAsDate = new Date();
    document.getElementById("descAndamentoManual").value = "";
    document.getElementById("respAndamentoManual").value = "";
    new bootstrap.Modal(document.getElementById("modalNovoAndamento")).show();
};

window.salvarAndamentoManual = async function () {
    const idProcesso = document.getElementById("IdProcesso").value;
    const data = document.getElementById("dataAndamentoManual").value;
    const desc = document.getElementById("descAndamentoManual").value;
    const respId = document.getElementById("respAndamentoManual").value;

    if (!data || !desc || !respId) { alert("Preencha todos os campos!"); return; }

    const payload = { processoId: idProcesso, data_evento: data, descricao: desc, responsavelId: respId };

    try {
        const res = await authFetch("/api/processos/andamento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Andamento registrado!");
            bootstrap.Modal.getInstance(document.getElementById("modalNovoAndamento")).hide();
            await carregarDadosProcesso(idProcesso);
        } else {
            const err = await res.json();
            alert("Erro ao salvar: " + (err.error || "Desconhecido"));
        }
    } catch (e) { alert("Erro de conexão"); }
};

window.irParaGerarPeticao = function () {
    const idProcesso = document.getElementById("IdProcesso").value;
    if (idProcesso) {
        let params = `idProcesso=${idProcesso}`;
        if (cachePublicacoes.length > 0) {
            const pubsOrdenadas = [...cachePublicacoes].sort((a, b) => new Date(b.data_publicacao) - new Date(a.data_publicacao));
            if (pubsOrdenadas[0]?.id) params += `&publicacaoId=${pubsOrdenadas[0].id}`;
        }
        window.location.href = `/gerarPeticao?${params}`;
    } else {
        alert("Salve o processo antes de gerar uma petição.");
    }
};

window.verPublicacao = function (idPublicacao) {
    const publicacao = cachePublicacoes.find(pub => pub.id === idPublicacao);
    if (publicacao) {
        document.getElementById("modalTextoPub").textContent = publicacao.texto_integral || "Texto indisponível.";
        document.getElementById("modalDataPub").textContent = publicacao.data_publicacao ? new Date(publicacao.data_publicacao).toLocaleDateString('pt-BR') : "-";
        new bootstrap.Modal(document.getElementById("modalPublicacao")).show();
    } else alert("Publicação não encontrada na memória.");
};

// --- LÓGICA DE DOCUMENTOS ---

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function configurarUpload() {
    const btnUpload = document.querySelector("#tab-documentos button");
    if (btnUpload) {
        let input = document.getElementById("inputUploadProcesso");
        if (!input) {
            input = document.createElement("input");
            input.type = "file";
            input.id = "inputUploadProcesso";
            input.style.display = "none";
            document.body.appendChild(input);

            input.addEventListener("change", async (e) => {
                if (e.target.files.length > 0) {
                    await fazerUploadProcesso(e.target.files[0]);
                    e.target.value = "";
                }
            });
        }

        btnUpload.onclick = (e) => {
            e.preventDefault();
            const id = document.getElementById("IdProcesso").value;
            const num = document.getElementById("NumProcesso").value;
            if (!id) return alert("Salve o processo antes de anexar documentos.");
            if (!num) return alert("O processo precisa de um número para criar a pasta.");
            document.getElementById("inputUploadProcesso").click();
        };
    }
}

async function fazerUploadProcesso(file) {
    const idProcesso = document.getElementById("IdProcesso").value;
    const numProcesso = document.getElementById("NumProcesso").value;
    const btnUpload = document.querySelector("#tab-documentos button");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("processoId", idProcesso);
    formData.append("numProcesso", numProcesso);
    formData.append("ignorarN8N", "true");

    try {
        if (btnUpload) {
            btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            btnUpload.disabled = true;
        }
        const res = await authFetch("/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Erro no upload");
        alert("Upload realizado com sucesso!");
        carregarDocumentosDoProcesso(idProcesso);
    } catch (error) {
        console.error(error);
        alert("Erro ao enviar arquivo.");
    } finally {
        if (btnUpload) {
            btnUpload.innerHTML = '<i class="fas fa-upload"></i> Upload de Arquivos';
            btnUpload.disabled = false;
        }
    }
}

window.deletarDocumento = async function (id) {
    if (!confirm("Deseja realmente excluir este arquivo?")) return;
    const btn = document.querySelector(`button[data-doc-id="${id}"]`);
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const res = await authFetch(`/upload/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Erro ao excluir");
        carregarDocumentosDoProcesso(document.getElementById("IdProcesso").value);
    } catch (error) {
        alert("Não foi possível excluir o arquivo.");
        if (btn) btn.innerHTML = '<i class="fas fa-trash"></i>';
    }
};

async function carregarDocumentosDoProcesso(idProcesso) {
    if (!idProcesso || idProcesso === "undefined" || idProcesso === "null") return;
    const tbody = document.querySelector("#tab-documentos tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        const res = await authFetch(`/upload/publicacoes?processoId=${idProcesso}`);
        const docs = await res.json();
        tbody.innerHTML = "";

        if (!docs || docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum documento anexado.</td></tr>';
            return;
        }

        docs.forEach(doc => {
            const dataUpload = doc.data_upload ? new Date(doc.data_upload).toLocaleDateString('pt-BR') : "-";
            let iconeArquivo = '<i class="far fa-file text-secondary"></i>';
            if (doc.tipo && doc.tipo.includes('pdf')) iconeArquivo = '<i class="far fa-file-pdf text-danger"></i>';
            else if (doc.tipo && doc.tipo.includes('image')) iconeArquivo = '<i class="far fa-file-image text-primary"></i>';
            const tamanhoFmt = doc.tamanho ? formatBytes(doc.tamanho) : "-";

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><a href="${doc.url_publica}" target="_blank" class="text-decoration-none text-dark">${iconeArquivo} ${doc.nome_arquivo}</a></td>
                <td><small class="text-muted">${doc.tipo || 'Arquivo'}</small></td>
                <td>${dataUpload}</td>
                <td>${tamanhoFmt}</td>
                <td class="text-end">
                    <a href="${doc.url_publica}" target="_blank" class="btn btn-sm btn-outline-primary me-1" title="Visualizar"><i class="fas fa-eye"></i></a>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletarDocumento(${doc.id})" data-doc-id="${doc.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar documentos.</td></tr>';
    }

    if (new URLSearchParams(window.location.search).get("modo") === 'leitura') {
        bloquearEdicao();
    }
}

function bloquearEdicao() {
    const titulo = document.getElementById("headerTitulo");
    if (titulo) titulo.innerHTML = '<i class="fas fa-lock"></i> Visualizar Processo (Leitura)';

    document.querySelectorAll("input, select, textarea").forEach(campo => {
        campo.disabled = true;
        campo.style.backgroundColor = "#e9ecef";
        campo.style.cursor = "not-allowed";
    });

    // Desabilita Tom Select
    document.querySelectorAll('.select-pessoa-busca').forEach(el => {
        if (el.tomselect) el.tomselect.disable();
    });

    const selectorsToHide = [
        "#btnSalvar", "#btnExcluir", "#btnAdicionarDoc", "button[onclick='salvarProcesso()']",
        "button[onclick='adicionarLinhaParte()']", "#tab-partes button", "#tab-andamentos button",
        "#tab-documentos button", "#tab-prazos button", ".tab-content .btn-outline-danger",
        ".tab-content .btn-outline-secondary", "td button"
    ];

    selectorsToHide.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = "none";
        });
    });
}

window.abrirModalPrazo = function () {
    document.getElementById("descPrazoManual").value = "";
    document.getElementById("dataPrazoManual").value = "";
    document.getElementById("respPrazoManual").value = "";
    const modalEl = document.getElementById("modalNovoPrazo");
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.salvarPrazoManual = async function () {
    const responsavelId = document.getElementById("respPrazoManual").value;
    const idProcesso = document.getElementById("IdProcesso").value;
    const descricao = document.getElementById("descPrazoManual").value;
    const dataLimite = document.getElementById("dataPrazoManual").value;

    if (!descricao || !dataLimite) {
        alert("Descrição e Data de Vencimento são obrigatórios!");
        return;
    }

    const payload = { processoId: idProcesso, descricao: descricao, data_limite: dataLimite, responsavelId: responsavelId };

    try {
        const btnSalvar = document.querySelector("#modalNovoPrazo .btn-primary");
        const textoOriginal = btnSalvar.innerHTML;
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        const res = await authFetch("/api/processos/prazo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Prazo manual criado com sucesso!");
            bootstrap.Modal.getInstance(document.getElementById("modalNovoPrazo")).hide();
            await carregarDadosProcesso(idProcesso);
        } else {
            const err = await res.json();
            alert("Erro ao criar prazo: " + (err.error || "Desconhecido"));
        }
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = textoOriginal;
    } catch (e) {
        alert("Erro de conexão ao salvar prazo.");
        console.error(e);
        const btnSalvar = document.querySelector("#modalNovoPrazo .btn-primary");
        if (btnSalvar) btnSalvar.disabled = false;
    }
};

async function carregarUsuariosResponsaveis() {
    try {
        const res = await authFetch("/api/users");
        const usuarios = await res.json();
        const selects = [document.getElementById("respPrazoManual"), document.getElementById("respAndamentoManual")];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">Selecione um responsável...</option>';
                usuarios.forEach(user => {
                    const opt = document.createElement("option");
                    opt.value = user.id;
                    opt.textContent = (user.nome && user.nome.trim() !== "") ? user.nome : user.email;
                    select.appendChild(opt);
                });
            }
        });
    } catch (e) { console.error("Erro ao carregar usuários:", e); }
}