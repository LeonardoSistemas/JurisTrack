import { formatarDataBR } from "/js/formatarData.js";
import { formatarDataBR_SoData_UTC } from "/js/formatarData.js";

const AUTH_TOKEN_KEY = "juristrack_token";
const SIMILARIDADE_EVENT = "similaridadePayload";
const SIMILARIDADE_UPLOAD_KEY = "similaridade_upload_id";

function switchToSimilaridadeTab() {
  const tabButton = document.querySelector('[data-bs-target="#tab-similaridade"]');
  if (tabButton && window.bootstrap?.Tab) {
    const tab = new bootstrap.Tab(tabButton);
    tab.show();
  }
}

function dispatchSimilaridadePayload(payload, { autoSend = true, source = "Payload recebido do fluxo N8N." } = {}) {
  if (!payload || !Array.isArray(payload) || payload.length === 0) {
    console.warn("Payload de similaridade vazio ou inválido", payload);
    return;
  }

  window.postMessage(
    {
      type: SIMILARIDADE_EVENT,
      payload,
      autoSend,
      source,
    },
    "*"
  );
  switchToSimilaridadeTab();
}

function selecionarUploadParaSimilaridade(uploadId) {
  if (!uploadId) return;
  try {
    sessionStorage.setItem(SIMILARIDADE_UPLOAD_KEY, uploadId);
  } catch {
    // ignore storage errors
  }
  window.__SIMILARIDADE_UPLOAD_ID__ = uploadId;
  window.postMessage({ type: "similaridadeUploadId", uploadId }, "*");
  switchToSimilaridadeTab();
}
function authFetch(url, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    window.location.href = "/login";
    return Promise.reject(new Error("Token ausente"));
  }
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  return fetch(url, { ...options, headers });
}

const form = document.getElementById("uploadForm");
const messageDiv = document.getElementById("message");
const filtroDataInicio = document.getElementById("filtro-data-inicio");
const filtroDataFim = document.getElementById("filtro-data-fim");
const btnAplicarFiltros = document.getElementById("btn-aplicar-filtros");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    messageDiv.textContent = "Enviando arquivo para análise...";
    messageDiv.className = "mt-3 text-center fw-bold text-primary";

    try {
      // CORREÇÃO: Aponta para a rota específica de análise
      const response = await authFetch("/upload/analise", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("upload/analise response", result);

      if (response.ok) {
        messageDiv.textContent = "Sucesso! Análise iniciada.";
        messageDiv.className = "mt-3 text-center fw-bold text-success";
        carregarTabela();
        const payload =
          result?.payloadSimilaridade ||
          result?.payload ||
          result?.similaridadePayload;
        if (payload) {
          dispatchSimilaridadePayload(payload, {
            autoSend: true,
            source: "Payload retornado após upload/N8N.",
          });
        }
        form.reset();
      } else {
        messageDiv.textContent = "Erro: " + (result.error || "Falha desconhecida");
        messageDiv.className = "mt-3 text-center fw-bold text-danger";
      }
    } catch (error) {
      console.error(error);
      messageDiv.textContent = "Erro de conexão ou arquivo inválido.";
      messageDiv.className = "mt-3 text-center fw-bold text-danger";
    }
  });
}

async function carregarTabela() {
  try {
    const response = await authFetch("/upload/publicacoes");
    if (!response.ok) throw new Error("Erro ao buscar dados");

    const dados = await response.json();
    
    // CORREÇÃO: Adicionar "T00:00:00" força o navegador a entender como data LOCAL,
    // garantindo que o dia comece à meia-noite do fuso horário do usuário, e não em UTC.
    const inicio = filtroDataInicio?.value 
      ? new Date(filtroDataInicio.value + "T00:00:00") 
      : null;
      
    const fim = filtroDataFim?.value 
      ? new Date(filtroDataFim.value + "T00:00:00") 
      : null;
    
    const filtrados = Array.isArray(dados)
      ? dados.filter((publicacao) => {
          if (!inicio && !fim) return true;
          const data = publicacao.data_upload ? new Date(publicacao.data_upload) : null;
          if (!data || Number.isNaN(data.getTime())) return false;

          // Se tiver início, a data deve ser maior ou igual
          if (inicio && data < inicio) return false;

          // Se tiver fim, ajustamos para o final desse dia LOCAL
          if (fim) {
            const endDay = new Date(fim);
            endDay.setHours(23, 59, 59, 999); // Vai para 23:59 do dia correto (ex: 14)
            if (data > endDay) return false;
          }
          return true;
        })
      : [];

    const tbody = document.querySelector("#tablesPublicacoes tbody");
    if(!tbody) return;

    tbody.innerHTML = ""; 

    filtrados.forEach((publicacao) => {
      const formattedDate = formatarDataBR(publicacao.data_upload);
      let statusHtml;

      if (publicacao.status === "processado") {
        statusHtml = `<button type="button" class="btn btn-success btn-sm btn-ver-similaridade" 
                              data-upload-id="${publicacao.id}" 
                              data-nome-arquivo="${publicacao.nome_arquivo}"> 
                        <i class="fas fa-check-circle me-1"></i> Processado
                      </button>`;
      } else if (publicacao.status === "pendente") {
        statusHtml = `<div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm text-warning me-2" role="status"></div>
                        <span class="badge bg-warning text-dark">Pendente</span>
                      </div>`;
      } else {
        statusHtml = `<span class="badge bg-secondary">${publicacao.status}</span>`;
      }
      
      // Ícone de Visualizar (Olho)
      const linkDisplay = `<a href="${publicacao.url_publica}" target="_blank" title="Visualizar PDF" class="btn btn-sm btn-outline-primary">
                             <i class="fas fa-eye"></i> Visualizar
                           </a>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${publicacao.id}</td>
            <td style="max-width: 200px;" class="text-truncate" title="${publicacao.nome_arquivo}">${publicacao.nome_arquivo}</td>
            <td>${linkDisplay}</td>
            <td>${formattedDate}</td>
            <td>${statusHtml}</td> `;

      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".btn-ver-similaridade").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const uploadId = e.currentTarget.getAttribute("data-upload-id");
        selecionarUploadParaSimilaridade(uploadId);
      });
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum arquivo em análise.</td></tr>`;
    }
  } catch (error) {
    console.error(error);
  }
}

// ... (Funções de Modal e EventListeners mantidas iguais)
async function carregarResultadoModal(nome_arquivo) {
  const tbody = document.querySelector("#tablesResultado tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="text-center">Carregando...</td></tr>`;

  try {
    const response = await authFetch(`/resultado/${nome_arquivo}`);
    if (!response.ok) throw new Error("Erro ao buscar detalhes");
    
    const resultados = await response.json();
    tbody.innerHTML = "";

    if (!resultados || !resultados.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Sem dados extraídos.</td></tr>`;
      return;
    }

    resultados.forEach((r) => {
      const fmt = window.formatarDataBR_SoData_UTC || formatarDataBR_SoData_UTC;
      const linkProcesso = r.numero_processo !== "N/A" 
        ? `<a href="#" class="link-primary fw-bold text-decoration-underline link-processo">${r.numero_processo}</a>` 
        : "N/A";
        
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${linkProcesso}</td>
        <td>${r.data_publicacao ? fmt(r.data_publicacao) : "-"}</td>
        <td>${r.prazo_entrega || "-"}</td> 
        <td>${r.data_vencimento_calculada ? fmt(r.data_vencimento_calculada) : "-"}</td>
        <td class="text-center">
          <a href="/gerarPeticao?publicacaoId=${r.publicacaoId}&voltarPara=${encodeURIComponent(nome_arquivo)}" 
             class="btn btn-primary btn-sm"><i class="fas fa-file-signature"></i></a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarTabela();
  setInterval(carregarTabela, 10000); 

  if (btnAplicarFiltros) {
    btnAplicarFiltros.addEventListener("click", () => {
      carregarTabela();
    });
  }

  const resultadoModal = document.getElementById("resultadoModal");
  if (resultadoModal) {
    resultadoModal.addEventListener("show.bs.modal", (e) => {
      const nome = e.relatedTarget?.getAttribute("data-nome-arquivo");
      if (nome) carregarResultadoModal(nome);
    });
  }
});