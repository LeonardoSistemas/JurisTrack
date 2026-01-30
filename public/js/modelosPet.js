// --- Seletores de Elementos de Estrutura ---
const sectionLista = document.getElementById("section-lista");
const sectionFormulario = document.getElementById("section-formulario");
const tituloFormulario = document.getElementById("tituloFormulario");
const formError = document.getElementById("formError");

// Botões de Navegação
const btnNovoModelo = document.getElementById("btnNovoModelo");
const btnVoltarLista = document.getElementById("btnVoltarLista");
const btnSalvarModelo = document.getElementById("btnSalvarModelo");

// Tabela
const tabelaBody = document.querySelector("#tabelaModelos tbody");

// Seletores do Modal de Detalhes
const detalhesModalElement = document.getElementById("detalhesModal");
const detalhesModal = new bootstrap.Modal(detalhesModalElement);
const detalhesTitulo = document.getElementById("detalhesTitulo");
const detalhesDescricao = document.getElementById("detalhesDescricao");
const detalhesTags = document.getElementById("detalhesTags");
const detalhesConteudo = document.getElementById("detalhesConteudo");

// Formulário
const formModelo = document.getElementById("formModelo");
const formModeloId = document.getElementById("formModeloId");
const formTitulo = document.getElementById("formTitulo");
const formDescricao = document.getElementById("formDescricao");
const formTags = document.getElementById("formTags");
// formConteudo é manipulado via TinyMCE

// Painel de Variáveis e Select
const painelVariaveis = document.getElementById("painelVariaveis");
const selectCategoriaVariaveis = document.getElementById(
  "selectCategoriaVariaveis"
);

// Confirmação de Exclusão
const confirmDeleteBox = document.getElementById("confirmDeleteBox");
const confirmDeleteBackdrop = document.getElementById("confirmDeleteBackdrop");
const btnCancelDelete = document.getElementById("btnCancelDelete");
const btnConfirmDelete = document.getElementById("btnConfirmDelete");

// Variável para guardar o ID ao deletar
let deleteId = null;
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

// --- Configuração das Variáveis (Baseado no Schema SQL) ---
/* ATENÇÃO: O Backend deve retornar o JSON com estas chaves exatas.
   Para colunas repetidas como 'Descricao', use ALIAS no SQL (ex: SELECT c.Descricao AS Cidade_Descricao FROM ...)
*/

const mapaVariaveis = {
  processo: [
    { label: "Número do Processo", value: "{{NumProcesso}}" }, // Tabela: processos
    { label: "Pasta", value: "{{Pasta}}" }, // Tabela: processos
    { label: "Data Inicial", value: "{{DataInicial}}" }, // Tabela: processos
    { label: "Data Saída", value: "{{DataSaida}}" }, // Tabela: processos
    { label: "Observações", value: "{{Obs}}" }, // Tabela: processos
    { label: "Valor", value: "{{ValorCausa}}" }, // Tabela: processos   
    { label: "Classe", value: "{{Classe}}" }, // Tabela: processos 
    { label: "Assunto", value: "{{Assunto}}" }, // Tabela: processos   
  ],
   partes: [
    { label: "Autor", value: "{{NOME_AUTOR}}" },
    { label: "Réu", value: "{{NOME_REU}}" },
    { label: "Autor Doc", value: "{{Autor_CPF}}" },
    { label: "Réu Doc", value: "{{Reu_CPF}}" },  
  ],
  local: [
    { label: "Cidade", value: "{{Cidade}}" }, // Tabela: cidades (Alias sugerido)
    { label: "UF (Estado)", value: "{{uf}}" }, // Tabela: estados
    { label: "Comarca", value: "{{Comarca}}" }, // Tabela: comarcas (Alias sugerido)
    { label: "Tribunal", value: "{{Tribunal}}" }, // Tabela: tribunais (Alias sugerido)
    { label: "Vara", value: "{{Vara}}" }, // Tabela: varas (Alias sugerido)
    { label: "Instância", value: "{{Instancia}}" }, // Tabela: instancias (Alias sugerido)
  ],
  /*datas: [
    { label: "Data Publicação", value: "{{data_publicacao}}" }, // Tabela: Publicacao
    { label: "Texto Publicação", value: "{{texto_integral}}" }, // Tabela: Publicacao
    { label: "Prazo (Dias)", value: "{{dias}}" }, // Tabela: Prazo
    { label: "Data Limite", value: "{{data_limite}}" }, // Tabela: Prazo
    { label: "Data Atual", value: "{{DATA_ATUAL}}" },
  ],*/
};
// --- Funções de Navegação e UI ---

function mostrarLista() {
  sectionFormulario.style.display = "none";
  sectionLista.style.display = "block";

  // Recarrega a lista para garantir dados atualizados
  carregarModelos();
}

function mostrarFormulario() {
  sectionLista.style.display = "none";
  sectionFormulario.style.display = "block";
  hideError();
}

function showError(message) {
  formError.textContent = message;
  formError.style.display = "block";
  // Rola até o erro
  formError.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  formError.style.display = "none";
}

/**
 * Renderiza as variáveis no painel lateral.
 */
function renderizarVariaveis() {
  if (!painelVariaveis) return;

  const categoriaSelecionada = selectCategoriaVariaveis.value;
  painelVariaveis.innerHTML = "";

  let variaveisParaMostrar = [];

  if (categoriaSelecionada === "todos") {
    Object.values(mapaVariaveis).forEach((lista) => {
      variaveisParaMostrar = [...variaveisParaMostrar, ...lista];
    });
  } else if (mapaVariaveis[categoriaSelecionada]) {
    variaveisParaMostrar = mapaVariaveis[categoriaSelecionada];
  }

  if (variaveisParaMostrar.length === 0) {
    painelVariaveis.innerHTML =
      '<span class="text-muted small">Nenhuma variável encontrada.</span>';
    return;
  }

  variaveisParaMostrar.forEach((item) => {
    const div = document.createElement("div");
    div.className = "var-item p-2 rounded d-flex flex-column align-items-start";
    div.setAttribute("draggable", true);
    div.title = "Arraste para o editor";
    div.style.cursor = "grab";
    div.style.border = "1px solid #dee2e6";
    div.style.marginBottom = "5px";
    div.style.backgroundColor = "#fff";

    div.innerHTML = `
            <strong class="text-primary" style="font-size: 0.8rem;">${item.label}</strong>
            <!---<code class="text-dark bg-light px-1 mt-1 rounded" style="font-size: 0.7rem;">${item.value}</code>--->
        `;

    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          templateVar: item.value,
        })
      );
      e.dataTransfer.effectAllowed = "copy";
    });

    painelVariaveis.appendChild(div);
  });
}

/**
 * Carrega a tabela de modelos.
 */
async function carregarModelos() {
  try {
    tabelaBody.innerHTML =
      '<tr><td colspan="4" class="text-center">Carregando...</td></tr>';
    const response = await authFetch("/api/modelos-peticao");

    if (!response.ok) throw new Error("Falha ao carregar modelos.");

    const modelos = await response.json();
    tabelaBody.innerHTML = "";

    if (modelos.length === 0) {
      tabelaBody.innerHTML =
        '<tr><td colspan="4" class="text-center">Nenhum modelo cadastrado.</td></tr>';
      return;
    }

    modelos.forEach((modelo) => {
      const tagsString =
        Array.isArray(modelo.tags) && modelo.tags.length > 0
          ? modelo.tags.join(", ")
          : "N/A";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${modelo.titulo || "N/A"}</td>
        <td>${modelo.descricao || "N/A"}</td>
        <td>${tagsString}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-success btn-details" data-id="${
            modelo.id
          }" title="Detalhes">
            <i class="fas fa-info-circle"></i>
          </button>
          <button class="btn btn-sm btn-primary btn-edit" data-id="${
            modelo.id
          }" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${
            modelo.id
          }" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });
  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
    tabelaBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro: ${error.message}</td></tr>`;
  }
}

/**
 * Inicia a criação de um novo modelo (Reseta e mostra Form).
 */
function iniciarCriacao() {
  tituloFormulario.textContent = "Nova Petição";
  formModelo.reset();
  formModeloId.value = "";

  if (tinymce.get("formConteudo")) {
    tinymce.get("formConteudo").setContent("");
  }

  selectCategoriaVariaveis.value = "todos";
  renderizarVariaveis();

  mostrarFormulario();
}

/**
 * Inicia a edição (Busca dados e mostra Form).
 */
async function iniciarEdicao(id) {
  try {
    const response = await authFetch(`/api/modelos-peticao/${id}`);
    if (!response.ok) throw new Error("Erro ao buscar modelo.");
    const modelo = await response.json();

    tituloFormulario.textContent = "Editar Petição";
    formModeloId.value = modelo.id;
    formTitulo.value = modelo.titulo || "";
    formDescricao.value = modelo.descricao || "";
    formTags.value = Array.isArray(modelo.tags) ? modelo.tags.join(", ") : "";

    if (tinymce.get("formConteudo")) {
      tinymce.get("formConteudo").setContent(modelo.conteudo || "");
    }

    selectCategoriaVariaveis.value = "todos";
    renderizarVariaveis();

    mostrarFormulario();
  } catch (err) {
    alert(err.message);
  }
}

async function abrirModalDetalhes(id) {
  try {
    detalhesTitulo.textContent = "Carregando...";
    detalhesDescricao.textContent = "...";
    detalhesTags.textContent = "...";
    detalhesConteudo.textContent = "...";
    detalhesModal.show();

    const response = await authFetch(`/api/modelos-peticao/${id}`);
    if (!response.ok) throw new Error("Falha ao buscar detalhes.");
    const modelo = await response.json();

    detalhesTitulo.textContent = modelo.titulo || "Sem Título";
    detalhesDescricao.textContent = modelo.descricao || "Nenhuma descrição";
    detalhesConteudo.innerHTML = modelo.conteudo || "Nenhum conteúdo";

    const tagsString = Array.isArray(modelo.tags)
      ? modelo.tags.join(", ")
      : "N/A";
    detalhesTags.textContent = tagsString;
  } catch (error) {
    detalhesConteudo.textContent = error.message;
  }
}

/**
 * Salva o modelo.
 */
async function salvarModelo() {
  const id = formModeloId.value;
  const url = id ? `/api/modelos-peticao/${id}` : "/api/modelos-peticao";
  const method = id ? "PUT" : "POST";

  const conteudoDoEditor = tinymce.get("formConteudo").getContent();

  const body = {
    titulo: formTitulo.value,
    descricao: formDescricao.value,
    tags: formTags.value,
    conteudo: conteudoDoEditor,
  };

  if (!body.titulo || !body.conteudo) {
    showError("Título e Conteúdo são obrigatórios.");
    return;
  }

  hideError();

  try {
    const response = await authFetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Erro ao salvar.");

    // Sucesso: volta para a lista
    mostrarLista();
  } catch (error) {
    console.error("Erro ao salvar:", error);
    showError(error.message);
  }
}

// Exclusão
function showDeleteConfirmation(id) {
  deleteId = id;
  confirmDeleteBox.style.display = "block";
  confirmDeleteBackdrop.style.display = "block";
}

function hideDeleteConfirmation() {
  deleteId = null;
  confirmDeleteBox.style.display = "none";
  confirmDeleteBackdrop.style.display = "none";
}

async function deletarModelo() {
  if (!deleteId) return;

  try {
    const response = await authFetch(`/api/modelos-peticao/${deleteId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Falha ao deletar.");

    hideDeleteConfirmation();
    carregarModelos();
  } catch (error) {
    alert("Erro ao excluir: " + error.message);
    hideDeleteConfirmation();
  }
}

// --- Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
  mostrarLista(); // Garante que começa na lista
  renderizarVariaveis();
});

selectCategoriaVariaveis.addEventListener("change", renderizarVariaveis);

// Navegação
btnNovoModelo.addEventListener("click", iniciarCriacao);
btnVoltarLista.addEventListener("click", mostrarLista);
btnSalvarModelo.addEventListener("click", salvarModelo);

// Tabela Actions
tabelaBody.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;

  if (button.classList.contains("btn-details")) {
    abrirModalDetalhes(id);
  } else if (button.classList.contains("btn-edit")) {
    iniciarEdicao(id);
  } else if (button.classList.contains("btn-delete")) {
    showDeleteConfirmation(id);
  }
});

btnCancelDelete.addEventListener("click", hideDeleteConfirmation);
btnConfirmDelete.addEventListener("click", deletarModelo);
confirmDeleteBackdrop.addEventListener("click", hideDeleteConfirmation);
