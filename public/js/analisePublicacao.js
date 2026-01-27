import { formatarDataBR_SoData } from "/js/formatarData.js";

const AUTH_TOKEN_KEY = "juristrack_token";

let analiseItens = [];
let sugestoesByProvidencia = new Map();
let currentItemId = null;
let currentPublicacaoId = null;

function getModalElements() {
  return {
    modal: document.getElementById("analisePublicacaoModal"),
    feedback: document.getElementById("analiseModalFeedback"),
    texto: document.getElementById("analiseModalTexto"),
    tipoAndamento: document.getElementById("analiseModalTipoAndamento"),
    itemId: document.getElementById("analiseModalItemId"),
    eventoId: document.getElementById("analiseModalEventoId"),
    processo: document.getElementById("analiseModalProcesso"),
    dataPublicacao: document.getElementById("analiseModalDataPublicacao"),
    providencia: document.getElementById("analiseModalProvidencia"),
    prazoData: document.getElementById("analiseModalPrazoData"),
    prazoInfo: document.getElementById("analiseModalPrazoInfo"),
    prazoAviso: document.getElementById("analiseModalPrazoAviso"),
    modelo: document.getElementById("analiseModalModelo"),
    responsavel: document.getElementById("analiseModalResponsavel"),
    observacao: document.getElementById("analiseModalObservacao"),
    observacaoJuridica: document.getElementById("analiseModalObservacaoJuridica"),
    salvar: document.getElementById("analiseModalSalvar"),
    salvarProximo: document.getElementById("analiseModalSalvarProximo"),
  };
}

function authFetch(url, options = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    window.location.href = "/login";
    return Promise.reject(new Error("Sessão expirada"));
  }
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  return fetch(url, { ...options, headers });
}

function resolveTextoPublicacao(item) {
  return (
    item?.texto_publicacao ||
    item?.texto ||
    item?.dados_originais?.texto ||
    "--"
  );
}

function resolveTipoAndamento(item) {
  return (
    item?.tipo_andamento ||
    item?.dados_originais?.tipo_andamento ||
    "--"
  );
}

function normalizeDateInput(value) {
  if (!value) return "";
  const raw = String(value);
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function setFeedback(message, variant = "info") {
  const { feedback } = getModalElements();
  if (!feedback) return;
  if (!message) {
    feedback.className = "alert d-none";
    feedback.textContent = "";
    return;
  }
  feedback.className = `alert alert-${variant}`;
  feedback.textContent = message;
}

function setLoading(isLoading) {
  const { salvar, salvarProximo } = getModalElements();
  if (salvar) salvar.disabled = isLoading;
  if (salvarProximo) salvarProximo.disabled = isLoading;
}

function updatePrazoAviso(dateValue) {
  const { prazoAviso } = getModalElements();
  if (!prazoAviso) return;
  prazoAviso.textContent = "";
  if (!dateValue) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chosen = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(chosen.getTime())) return;
  if (chosen < today) {
    prazoAviso.textContent = "Data retroativa, confirme se está correto.";
  }
}

function buildEventoOptions(eventos = []) {
  if (!eventos.length) {
    return `<option value="">Sem evento</option>`;
  }
  return eventos
    .map((evento) => `<option value="${evento.id}">${evento.nome}</option>`)
    .join("");
}

function updateModeloOptions(modelo) {
  const { modelo: modeloSelect } = getModalElements();
  if (!modeloSelect) return;
  modeloSelect.innerHTML = "";
  if (!modelo) {
    modeloSelect.innerHTML = `<option value="">Sem modelo sugerido</option>`;
    return;
  }
  modeloSelect.innerHTML = `<option value="${modelo.id}">${modelo.nome}</option>`;
}

function updatePrazoInfo(prazo) {
  const { prazoInfo, prazoData } = getModalElements();
  if (!prazoInfo || !prazoData) return;
  if (!prazo) {
    prazoInfo.textContent = "Prazo: -";
    prazoData.value = "";
    updatePrazoAviso("");
    return;
  }
  const diasLabel = prazo.dias ? `${prazo.dias} dia(s)` : "Data fixa";
  const tipoLabel = prazo.tipo ? ` • ${prazo.tipo}` : "";
  prazoInfo.textContent = `Prazo: ${diasLabel}${tipoLabel}`;
  prazoData.value = normalizeDateInput(prazo.data_vencimento);
  updatePrazoAviso(prazoData.value);
}

function updateProvidenciaSelection(providenciaId) {
  const { providencia, observacaoJuridica } = getModalElements();
  if (!providencia || !sugestoesByProvidencia.size) return;
  const selectedId = providenciaId || providencia.value;
  const sugestao = sugestoesByProvidencia.get(selectedId);
  updatePrazoInfo(sugestao?.prazo_sugerido || null);
  updateModeloOptions(sugestao?.modelo_sugerido || null);
  if (observacaoJuridica) {
    observacaoJuridica.textContent = sugestao?.observacao_juridica || "-";
  }
}

function buildProvidenciaOptions(padrao, alternativas) {
  const options = [];
  const ids = new Set();
  const addOption = (item, labelSuffix = "") => {
    if (!item || ids.has(item.id)) return;
    ids.add(item.id);
    options.push(
      `<option value="${item.id}">${item.nome}${labelSuffix}</option>`
    );
  };
  addOption(padrao, " (padrão)");
  (alternativas || []).forEach((alt) => addOption(alt));
  return options.join("");
}

function buildResponsavelOptions(usuarios = []) {
  const options = ['<option value="">Responsável padrão (usuário atual)</option>'];
  const normalized = (usuarios || [])
    .filter((usuario) => usuario?.id)
    .map((usuario) => ({
      id: usuario.id,
      label:
        usuario.nome && usuario.email
          ? `${usuario.nome} (${usuario.email})`
          : usuario.nome || usuario.email || "Usuário sem nome",
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));

  normalized.forEach((usuario) => {
    options.push(`<option value="${usuario.id}">${usuario.label}</option>`);
  });

  return options.join("");
}

async function carregarResponsaveis() {
  const { responsavel } = getModalElements();
  if (!responsavel) return [];
  responsavel.innerHTML = `<option value="">Carregando responsáveis...</option>`;

  try {
    const response = await authFetch("/api/users?status=ativo");
    const body = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(body?.message || body?.error || "Falha ao carregar responsáveis.");
    }
    const usuarios = Array.isArray(body) ? body : [];
    responsavel.innerHTML = buildResponsavelOptions(usuarios);
    return usuarios;
  } catch (error) {
    console.warn("[analise] falha ao carregar responsáveis", error);
    responsavel.innerHTML = '<option value="">Responsável padrão (usuário atual)</option>';
    return [];
  }
}

function getItemById(id) {
  return analiseItens.find((item) => item?.id === id);
}

function getNextItemId(currentId) {
  if (!analiseItens.length || analiseItens.length === 1) return null;
  const index = analiseItens.findIndex((item) => item.id === currentId);
  if (index < 0) return null;
  const next = analiseItens[index + 1] || analiseItens[0];
  if (next?.id === currentId) return null;
  return next?.id || null;
}

function removeItemFromQueue(itemId) {
  analiseItens = analiseItens.filter((item) => item.id !== itemId);
}

async function fetchPublicacaoId(itemId) {
  const response = await authFetch(`/api/similaridade/itens/${itemId}/publicacao`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || "Falha ao buscar publicação vinculada.");
  }
  return body?.publicacaoId || body?.publicacao_id || null;
}

async function ensurePublicacaoId(item) {
  if (item?.publicacao_id) {
    return item.publicacao_id;
  }
  const publicacaoId = await fetchPublicacaoId(item?.id);
  if (publicacaoId) {
    item.publicacao_id = publicacaoId;
  }
  return publicacaoId;
}

function populateModalBase(item) {
  const {
    texto,
    tipoAndamento,
    itemId,
    eventoId,
    processo,
    dataPublicacao,
    responsavel,
  } = getModalElements();
  if (texto) texto.textContent = resolveTextoPublicacao(item);
  if (tipoAndamento) tipoAndamento.textContent = resolveTipoAndamento(item);
  if (itemId) itemId.value = item?.id || "";
  if (eventoId) {
    eventoId.innerHTML = `<option value="">Carregando...</option>`;
    eventoId.value = "";
  }
  if (processo) processo.value = item?.numero_processo || "Processo sem número";
  if (dataPublicacao) {
    dataPublicacao.value = item?.data_publicacao
      ? formatarDataBR_SoData(item.data_publicacao)
      : "-";
  }
  if (responsavel) responsavel.value = "";
}

function populateSugestoes(sugestao) {
  const {
    eventoId,
    providencia,
    observacao,
    observacaoJuridica,
  } = getModalElements();
  sugestoesByProvidencia = new Map();

  if (eventoId) {
    eventoId.innerHTML = buildEventoOptions(sugestao?.eventos || []);
    eventoId.value = sugestao?.evento?.id || "";
  }
  if (observacao) observacao.value = "";
  if (observacaoJuridica) observacaoJuridica.textContent = "-";

  const padrao = sugestao?.providencia_padrao || null;
  const alternativas = sugestao?.alternativas || [];
  const options = buildProvidenciaOptions(padrao, alternativas);

  if (providencia) {
    providencia.innerHTML = options || `<option value="">Sem providência</option>`;
  }

  [padrao, ...alternativas].forEach((prov) => {
    if (prov?.id) sugestoesByProvidencia.set(prov.id, prov);
  });

  if (providencia && providencia.value) {
    updateProvidenciaSelection(providencia.value);
  } else if (padrao?.id) {
    if (providencia) providencia.value = padrao.id;
    updateProvidenciaSelection(padrao.id);
  } else {
    updatePrazoInfo(null);
    updateModeloOptions(null);
  }
}

async function carregarSugestoes(itemId) {
  const eventoId = getModalElements().eventoId?.value || "";
  const query = eventoId ? `?evento_id=${encodeURIComponent(eventoId)}` : "";
  const response = await authFetch(`/api/analise/sugestao/${itemId}${query}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || "Falha ao buscar sugestões.");
  }
  return body;
}

async function salvarAnalise({ itemId, saveNext }) {
  const {
    eventoId,
    providencia,
    prazoData,
    modelo,
    observacao,
    responsavel,
  } = getModalElements();

  if (!currentPublicacaoId) {
    throw new Error("Publicação vinculada não encontrada para esta análise.");
  }

  const prazoSugestao = providencia?.value
    ? sugestoesByProvidencia.get(providencia.value)?.prazo_sugerido
    : null;

  const hasPrazo = Boolean(prazoData?.value || prazoSugestao);
  const prazoFinal = hasPrazo
    ? {
        ...(prazoSugestao || {}),
        data_vencimento: prazoData?.value || prazoSugestao?.data_vencimento || null,
      }
    : null;

  const responsavelId = responsavel?.value || null;

  const decisaoFinalJson = {
    item_similaridade_id: itemId,
    publicacao_id: currentPublicacaoId,
    evento_id: eventoId?.value || null,
    providencia_id: providencia?.value || null,
    prazo_final: prazoFinal,
    modelo_id: modelo?.value || null,
    observacao: observacao?.value?.trim() || null,
    responsavel_id: responsavelId,
  };

  const payload = {
    item_similaridade_id: itemId,
    publicacao_id: currentPublicacaoId,
    prazo_final: prazoFinal,
    decisao_final_json: decisaoFinalJson,
    responsavel_id: responsavelId,
  };

  if (!decisaoFinalJson.evento_id || !decisaoFinalJson.providencia_id) {
    throw new Error("Selecione um evento e uma providência antes de salvar.");
  }

  if (!prazoFinal?.data_vencimento) {
    throw new Error("Informe a data final do prazo antes de salvar.");
  }

  const response = await authFetch("/api/analise/confirmar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = body?.details?.join(" ");
    throw new Error(details || body?.error || "Falha ao salvar análise.");
  }

  removeItemFromQueue(itemId);
  document.dispatchEvent(
    new CustomEvent("analise:item-processed", { detail: { itemId, saveNext } })
  );
  return body;
}

function bindFieldHandlers() {
  const { providencia, prazoData, eventoId } = getModalElements();
  if (providencia) {
    providencia.addEventListener("change", (e) => {
      updateProvidenciaSelection(e.target.value);
    });
  }
  if (prazoData) {
    prazoData.addEventListener("change", (e) => {
      updatePrazoAviso(e.target.value);
    });
  }
  if (eventoId) {
    eventoId.addEventListener("change", async (e) => {
      if (!currentItemId || !e.target.value) return;
      setFeedback("Atualizando sugestões...", "info");
      setLoading(true);
      try {
        const sugestao = await carregarSugestoes(currentItemId);
        populateSugestoes(sugestao);
        setFeedback(null);
      } catch (error) {
        setFeedback(error.message, "danger");
      } finally {
        setLoading(false);
      }
    });
  }
}

function bindButtons() {
  const { salvar, salvarProximo } = getModalElements();
  if (salvar) {
    salvar.addEventListener("click", async () => {
      if (!currentItemId) return;
      setFeedback(null);
      setLoading(true);
      try {
        await salvarAnalise({ itemId: currentItemId, saveNext: false });
        setFeedback("Análise salva com sucesso.", "success");
        const { modal } = getModalElements();
        if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
      } catch (error) {
        setFeedback(error.message, "danger");
      } finally {
        setLoading(false);
      }
    });
  }

  if (salvarProximo) {
    salvarProximo.addEventListener("click", async () => {
      if (!currentItemId) return;
      setFeedback(null);
      setLoading(true);
      try {
        const nextId = getNextItemId(currentItemId);
        await salvarAnalise({ itemId: currentItemId, saveNext: true });
        if (nextId) {
          await abrirModalAnalise(nextId);
        } else {
          setFeedback("Análise salva. Não há mais itens pendentes.", "success");
          const { modal } = getModalElements();
          if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
        }
      } catch (error) {
        setFeedback(error.message, "danger");
      } finally {
        setLoading(false);
      }
    });
  }
}

export function setAnaliseItens(items) {
  analiseItens = Array.isArray(items) ? [...items] : [];
}

export async function abrirModalAnalise(itemOrId) {
  const { modal } = getModalElements();
  if (!modal) return;

  const item =
    typeof itemOrId === "string" ? getItemById(itemOrId) : itemOrId;
  if (!item?.id) {
    setFeedback("Item não encontrado para análise.", "warning");
    return;
  }

  currentItemId = item.id;
  currentPublicacaoId = null;
  populateModalBase(item);
  setFeedback("Carregando sugestões...", "info");
  setLoading(true);

  try {
    const publicacaoId = await ensurePublicacaoId(item);
    if (!publicacaoId) {
      throw new Error("Publicação vinculada não encontrada para este item.");
    }
    currentPublicacaoId = publicacaoId;
    const responsaveisPromise = carregarResponsaveis();
    const sugestao = await carregarSugestoes(item.id);
    populateSugestoes(sugestao);
    await responsaveisPromise;
    setFeedback(null);
    bootstrap.Modal.getOrCreateInstance(modal).show();
  } catch (error) {
    setFeedback(error.message || "Erro ao carregar sugestões.", "danger");
    bootstrap.Modal.getOrCreateInstance(modal).show();
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindFieldHandlers();
  bindButtons();
});

window.abrirModalAnalise = abrirModalAnalise;
