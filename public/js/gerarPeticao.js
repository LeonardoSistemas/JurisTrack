// --- Seletores de Elementos ---
const selectModelo = document.getElementById("selectModelo");
const btnSalvarDocumento = document.getElementById("btnSalvarDocumento");
const btnImprimirDocumento = document.getElementById("btnImprimirDocumento");

// --- Variáveis Globais ---
let dadosProcessoGlobal = {};
let publicacaoId = null;
let processoId = null;
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

// --- Inicialização ---
document.addEventListener("DOMContentLoaded", async () => {
  inicializarTinyMCE();
  await carregarContextoDoProcesso(); // 1. Baixa dados (Processo ou Publicação)
  carregarModelosDropdown(); // 2. Carrega lista de modelos
  configurarBotaoVoltar(); // 3. Ajusta link de voltar
});

function configurarBotaoVoltar() {
  const params = new URLSearchParams(window.location.search);
  const arquivoParaVoltar = params.get("voltarPara");
  const btnVoltar = document.querySelector('a[href="/upload"]');
  
  // Se veio da ficha do processo, o voltar deve ir para lá
  if (processoId) {
      if (btnVoltar) {
          btnVoltar.href = `/html/fichaProcesso.html?id=${processoId}`;
          btnVoltar.innerHTML = '<i class="fas fa-arrow-left me-1"></i> Voltar ao Processo';
      }
      return;
  }

  // Se veio do upload
  if (btnVoltar && arquivoParaVoltar) {
    btnVoltar.href = `/?reabrirModal=${encodeURIComponent(arquivoParaVoltar)}`;
  }
}

/**
 * Configura TinyMCE
 */
function inicializarTinyMCE() {
  tinymce.init({
    selector: "#resultadoFinal",
    language: "pt_BR",
    content_style: `
      * { 
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 14px !important;
        color: #000000 !important;
      }
      body { 
        margin: 20px !important;
        line-height: 1.5 !important; 
      }
      p { margin-bottom: 10px !important; }
    `,
    paste_as_text: true, 
    forced_root_block: "p",
    plugins:
      "anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount",
    toolbar:
      "undo redo | blocks fontfamily fontsize | bold italic underline | align lineheight | numlist bullist indent outdent | removeformat",
    height: 650,
    menubar: false,
    elementpath: false,
  });
}

/**
 * Busca os dados do processo via API e guarda em dadosProcessoGlobal.
 * [ATUALIZADO] Prioriza busca pelo Processo (DB) se disponivel.
 */
async function carregarContextoDoProcesso() {
  const urlParams = new URLSearchParams(window.location.search);
  publicacaoId = urlParams.get("publicacaoId");
  processoId = urlParams.get("idProcesso");

  let url = "";

  // ALTERAÇÃO AQUI: Prioriza o contexto do Processo (Banco de Dados)
  // pois ele traz dados formatados para modelo (Autor, Réu, Vara, etc)
  if (processoId) {
    url = `/api/processos/${processoId}/contexto-modelo`;
  } else if (publicacaoId) {
    // Se só tiver publicacaoId (fluxo do upload/OCR), usa a rota antiga
    url = `/process-data/${publicacaoId}`;
  } else {
    console.warn("Nenhum ID (publicacao ou processo) fornecido.");
    return;
  }

  try {
    const response = await authFetch(url);
    if (!response.ok) throw new Error("Erro ao buscar dados do processo");

    dadosProcessoGlobal = await response.json();

    // Tratamento de Datas: Converte YYYY-MM-DD para DD/MM/YYYY
    Object.keys(dadosProcessoGlobal).forEach((key) => {
      const val = dadosProcessoGlobal[key];
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        dadosProcessoGlobal[key] = formatarDataParaBr(val);
      }
    });

    console.log("Dados carregados para o modelo:", dadosProcessoGlobal);
  } catch (error) {
    console.error(error);
    alert("Aviso: Não foi possível carregar os dados automáticos do processo.");
  }
}

function formatarDataParaBr(dataString) {
  if (!dataString) return "";
  const dataParte = dataString.split("T")[0];
  const partes = dataParte.split("-");
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return dataString;
}

/**
 * Preenche o select com os modelos do banco.
 */
async function carregarModelosDropdown() {
  try {
    const r = await authFetch("/api/modelos-peticao");
    const m = await r.json();

    selectModelo.innerHTML =
      '<option value="">-- Selecione um modelo --</option>';

    m.forEach((mod) => {
      const opt = document.createElement("option");
      opt.value = mod.id;
      opt.textContent = mod.titulo;
      selectModelo.appendChild(opt);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const modeloIdFromUrl = urlParams.get("modeloId");
    if (modeloIdFromUrl) {
      selectModelo.value = modeloIdFromUrl;
      buscarModeloCompleto(modeloIdFromUrl);
    }
  } catch (e) {
    console.error(e);
  }
}

async function buscarModeloCompleto(id) {
  const editor = tinymce.get("resultadoFinal");
  if (!editor || !id) return;

  try {
    editor.setProgressState(true);

    const response = await authFetch(`/api/modelos-peticao/${id}`);
    const modelo = await response.json();
    let texto = modelo.conteudo || "";

    if (!texto.includes("<p") && !texto.includes("<div")) {
      texto = texto.replace(/\n/g, "<br>");
    }

    if (dadosProcessoGlobal && Object.keys(dadosProcessoGlobal).length > 0) {
      Object.entries(dadosProcessoGlobal).forEach(([key, valor]) => {
        if (valor) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
          texto = texto.replace(regex, valor);
        }
      });
    }

    editor.setContent(texto);
    editor.setProgressState(false);
  } catch (error) {
    console.error(error);
    editor.setProgressState(false);
    alert("Erro ao carregar e preencher o modelo.");
  }
}

selectModelo.addEventListener("change", () =>
  buscarModeloCompleto(selectModelo.value)
);

// --- Botões Salvar/Imprimir ---

if (btnImprimirDocumento) {
  btnImprimirDocumento.addEventListener("click", () => {
    const editor = tinymce.get("resultadoFinal");
    if (editor) {
      const win = window.open("", "", "height=700,width=900");
      win.document.write(editor.getContent());
      win.print();
      win.close();
    }
  });
}


if (btnSalvarDocumento) {
  btnSalvarDocumento.addEventListener("click", async () => {
    const editor = tinymce.get("resultadoFinal");
    const conteudo = editor.getContent();

    if (!conteudo || conteudo.trim() === "") {
      return alert("O documento está vazio.");
    }

    const select = document.getElementById("selectModelo");
    const modeloTexto =
      select.selectedIndex >= 0
        ? select.options[select.selectedIndex].text
        : null;

    try {
      btnSalvarDocumento.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Salvando...';
      btnSalvarDocumento.disabled = true;

      const body = {
        publicacao_id: publicacaoId, // Será enviado se estiver na URL (mesmo com processoId)
        processo_id: processoId,     
        conteudo_final: conteudo,
        modelo_utilizado: modeloTexto,
      };

      const res = await authFetch("/peticoes-finalizadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erro ao salvar.");
      }

      alert("Petição salva com sucesso!");
    } catch (e) {
      alert(e.message);
    } finally {
      btnSalvarDocumento.disabled = false;
      btnSalvarDocumento.innerHTML =
        '<i class="fas fa-save me-1"></i> Salvar no Supabase';
    }
  });
}