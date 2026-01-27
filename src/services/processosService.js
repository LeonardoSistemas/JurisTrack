import supabase from "../config/supabase.js";
import { injectTenant, withTenantFilter } from "../repositories/tenantScope.js";

const PRAZO_STATUS_DOMAIN = "prazo";
const PRAZO_STATUS_DEFAULT = "pendente";

function assertPrazoStatusPayload({ prazoId, statusId, usuarioId }) {
  if (!prazoId) {
    const error = new Error("prazoId é obrigatório.");
    error.statusCode = 400;
    throw error;
  }
  if (!statusId) {
    const error = new Error("statusId é obrigatório.");
    error.statusCode = 400;
    throw error;
  }
  if (!usuarioId) {
    const error = new Error("usuarioId é obrigatório.");
    error.statusCode = 401;
    throw error;
  }
}

async function fetchDefaultPrazoStatusId() {
  const { data, error } = await supabase
    .from("aux_status")
    .select("id")
    .eq("nome", PRAZO_STATUS_DEFAULT)
    .eq("dominio", PRAZO_STATUS_DOMAIN)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Default prazo status not found.");
  }

  return data.id;
}

async function fetchPrazoSnapshot(prazoId, tenantId) {
  const { data, error } = await withTenantFilter("Prazo", tenantId)
    .select("*")
    .eq("id", prazoId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function fetchPrazoStatusById(statusId) {
  const { data, error } = await supabase
    .from("aux_status")
    .select("id")
    .eq("id", statusId)
    .eq("dominio", PRAZO_STATUS_DOMAIN)
    .eq("ativo", true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    const err = new Error("Status de prazo inválido.");
    err.statusCode = 404;
    throw err;
  }
  return data.id;
}

async function fetchPrazoStatuses() {
  const { data, error } = await supabase
    .from("aux_status")
    .select("id, nome, cor_hex")
    .eq("dominio", PRAZO_STATUS_DOMAIN)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

function normalizeProcessoPayload(dados) {
  if (!dados || typeof dados !== "object") return {};
  const payload = { ...dados };

  if ("data_distribuicao" in payload && !("datainicial" in payload)) {
    payload.datainicial = payload.data_distribuicao;
  }
  delete payload.data_distribuicao;

  if (!payload.pasta) {
    if (payload.numprocesso) {
      payload.pasta = payload.numprocesso;
    } else {
      payload.pasta = "sem_pasta";
    }
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") payload[key] = null;
  });

  return payload;
}

function sanitizeUpdatePayload(dados) {
  const payload = normalizeProcessoPayload(dados);
  delete payload.tenant_id;
  return payload;
}

export const listarProcessos = async (filtros, tenantId) => {
  let query = withTenantFilter("processos", tenantId)
    .select(`
    idprocesso,
    numprocesso,
    datainicial,
    assunto,
    situacao:situacoes (idsituacao, descricao ),
    cidades ( descricao, estados ( uf ) ),
    comarcas (idcomarca, descricao ),
    partes:processo_partes ( tipo_parte, pessoas ( nome ) )
  `)
    .is("deleted_at", null);

  if (filtros.busca) {
    query = query.or(
      `numprocesso.ilike.%${filtros.busca}%,assunto.ilike.%${filtros.busca}%`
    );
  }

  if (filtros.situacao) {
    query = query.eq("idsituacao", filtros.situacao);
  }

  if (filtros.comarca) {
    query = query.eq("idcomarca", filtros.comarca);
  }

  // Ordena por Data Inicial (Decrescente) e Limita a 50 resultados
  query = query.order("datainicial", { ascending: false }).limit(50);

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const obterProcessoCompleto = async (id, tenantId) => {
  const processoQuery = withTenantFilter("processos", tenantId)
    .select(`
      *,
      cidades ( idcidade, descricao, idestado ),
      comarcas ( idcomarca, descricao ),
      varas ( idvara, descricao ),
      tipo_acao:tipos_acao ( idtipoacao, descricao ), 
      rito:ritos ( idrito, descricao ),
      esfera:esferas ( idesfera, descricao ),
      fase:fases ( idfase, descricao ),
      situacao:situacoes ( idsituacao, descricao ),
      probabilidade:probabilidades ( idprobabilidade, descricao ), 
      moeda:moedas ( idmoeda, descricao ),
      partes:processo_partes ( id, tipo_parte, pessoas ( idpessoa, nome, cpf_cnpj ) ),
      advogado:pessoas!fk_processos_advogado ( idpessoa, nome ),
      Prazo!prazo_processoid_fkey (
        *,
        responsavel:users!Prazo_responsavelId_fkey ( nome )
      ),

      Publicacao!"publicacao_processoid_fkey" (
        id,
        texto_integral,
        data_publicacao,
        Andamento!andamento_publicacaoid_fkey ( * ),
        Historico_Peticoes!historico_peticoes_publicacao_id_fkey ( * )
      ),
      
      Andamento!"Andamento_processoId_fkey" (
        *,
        responsavel:pessoas!Andamento_responsavelId_fkey ( nome )
      )
    `)
    .eq("idprocesso", id)
    .maybeSingle();

  const [{ data, error }, prazoStatuses] = await Promise.all([
    processoQuery,
    fetchPrazoStatuses(),
  ]);

  if (error) {
    console.error("ERRO SUPABASE:", error); // Verifique o terminal do VS Code/Node
    throw error;
  }

  if (!data) return data;
  return {
    ...data,
    prazo_statuses: prazoStatuses,
  };
};

export const criarProcesso = async (dados, tenantId) => {
  const { partes, ...dadosProcesso } = dados;
  const payload = injectTenant(normalizeProcessoPayload(dadosProcesso), tenantId);
  const { data, error } = await supabase
    .from("processos")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  if (partes && partes.length > 0) {
    const partesPayload = partes.map((p) => ({
      idprocesso: data.idprocesso,
      idpessoa: p.idpessoa,
      tipo_parte: p.tipo,
      tenant_id: tenantId,
    }));
    await supabase.from("processo_partes").insert(partesPayload);
  }

  return data;
};

export const atualizarProcesso = async (id, dados, tenantId) => {
  const { partes, ...dadosProcesso } = dados;
  const payload = sanitizeUpdatePayload(dadosProcesso);

  const { data, error } = await withTenantFilter("processos", tenantId)
    .update(payload)
    .eq("idprocesso", id)
    .select()
    .maybeSingle();

  if (error) throw error;

  if (partes) {
    // Remove partes existentes para substituir (Estratégia Full Sync)
    await withTenantFilter("processo_partes", tenantId)
      .delete()
      .eq("idprocesso", id);

    if (partes.length > 0) {
      const partesPayload = partes.map((p) => ({
        idprocesso: id,
        idpessoa: p.idpessoa,
        tipo_parte: p.tipo,
        tenant_id: tenantId,
      }));
      await supabase.from("processo_partes").insert(partesPayload);
    }
  }

  return data;
};

export const excluirProcesso = async (id, tenantId) => {
  const { error } = await withTenantFilter("processos", tenantId)
    .update({ deleted_at: new Date() })
    .eq("idprocesso", id);
  if (error) throw error;
  return true;
};

export const obterContextoParaModelo = async (idProcesso, tenantId) => {
  const { data, error } = await withTenantFilter("processos", tenantId)
    .select(
      `
      numprocesso,
      pasta,
      datainicial,
      datasaida,
      obs,
      valor_causa,
      classe_processual,
      assunto,
      cidades ( descricao, estados ( uf ) ),
      comarcas ( descricao ),
      tribunais ( descricao ),
      varas ( descricao ),
      instancias ( descricao ),
      partes:processo_partes ( tipo_parte, pessoas ( nome, cpf_cnpj ) ),
      advogado:pessoas!fk_processos_advogado ( nome,cpf_cnpj)
    `
    )
    .eq("idprocesso", idProcesso)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Helper para formatar lista de nomes
  const getNomes = (tipo) => data.partes?.filter(p => p.tipo_parte === tipo).map(p => p.pessoas?.nome).join(", ") || "";
  const getCPFs = (tipo) => data.partes?.filter(p => p.tipo_parte === tipo).map(p => p.pessoas?.cpf_cnpj).join(", ") || "";

  const contexto = {
    NumProcesso: data.numprocesso || "S/N",
    Pasta: data.pasta || "",
    DataInicial: data.datainicial
      ? new Date(data.datainicial).toLocaleDateString("pt-BR")
      : "",
    DataSaida: data.datasaida
      ? new Date(data.datasaida).toLocaleDateString("pt-BR")
      : "",
    Obs: data.obs || "",
    ValorCausa: data.valor_causa
      ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        currencyDisplay: "symbol"
      }).format(data.valor_causa)
      : "",
    Classe: data.classe_processual || "",
    Assunto: data.assunto || "",
    Cidade: data.cidades?.descricao || "",
    uf: data.cidades?.estados?.uf || "",
    Comarca: data.comarcas?.descricao || "",
    Tribunal: data.tribunais?.descricao || "",
    Vara: data.varas?.descricao || "",
    Instancia: data.instancias?.descricao || "",
    NOME_AUTOR: getNomes('Autor'),
    Autor_CPF: getCPFs('Autor'),
    NOME_REU: getNomes('Réu'),
    Reu_CPF: getCPFs('Réu'),
    NOME_ADVOGADO: data.advogado?.nome || "",
    DATA_ATUAL: new Date().toLocaleDateString("pt-BR"),
  };

  return contexto;
};

export const criarPrazoManual = async (dados, tenantId) => {
  const statusId = dados.status_id ?? (await fetchDefaultPrazoStatusId());
  const prazoPayload = injectTenant(
    {
      descricao: dados.descricao,
      data_limite: dados.data_limite,
      processoid: dados.processoId,
      status_id: statusId,
      responsavelId: dados.responsavelId ?? null,
    },
    tenantId
  );

  const { data, error } = await supabase
    .from("Prazo")
    .insert([prazoPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const atualizarStatusPrazo = async (
  { prazoId, statusId, usuarioId },
  tenantId
) => {
  assertPrazoStatusPayload({ prazoId, statusId, usuarioId });

  const [prazo, statusFinalId] = await Promise.all([
    fetchPrazoSnapshot(prazoId, tenantId),
    fetchPrazoStatusById(statusId),
  ]);

  if (!prazo) {
    const error = new Error("Prazo não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (prazo.status_id === statusFinalId) {
    return prazo;
  }

  const { data: prazoAtualizado, error: updateError } = await withTenantFilter(
    "Prazo",
    tenantId
  )
    .update({ status_id: statusFinalId })
    .eq("id", prazoId)
    .select()
    .maybeSingle();

  if (updateError) throw updateError;

  const { error: auditError } = await supabase.from("prazo_auditoria").insert([
    {
      prazo_id: prazoId,
      status_anterior_id: prazo.status_id,
      status_novo_id: statusFinalId,
      usuario_id: usuarioId,
    },
  ]);

  if (auditError) throw auditError;

  return prazoAtualizado ?? prazo;
};