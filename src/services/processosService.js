import supabase from "../config/supabase.js";
import { injectTenant, withTenantFilter } from "../repositories/tenantScope.js";

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
  const { data, error } = await withTenantFilter("processos", tenantId)
    .select(
      `
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

      Publicacao (
        id,
        texto_integral,
        data_publicacao,
        Prazo ( * ),
        Andamento ( * ),
        Historico_Peticoes ( * )
      ),
      
      Andamento (
        *
      )
    `
    )
    .eq("idprocesso", id)
    .eq("Publicacao.tenant_id", tenantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return data;

  const normalizeArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const responsavelIds = new Set();

  normalizeArray(data.Andamento).forEach((andamento) => {
    const responsavelId =
      andamento?.responsavelId ?? andamento?.responsavelid ?? null;
    if (responsavelId) responsavelIds.add(responsavelId);
  });

  normalizeArray(data.Publicacao).forEach((pub) => {
    normalizeArray(pub?.Prazo).forEach((prazo) => {
      const responsavelId =
        prazo?.responsavelId ?? prazo?.responsavelid ?? null;
      if (responsavelId) responsavelIds.add(responsavelId);
    });
  });

  if (responsavelIds.size > 0) {
    const { data: responsaveis, error: respError } = await supabase
      .from("pessoas")
      .select("idpessoa, nome")
      .in("idpessoa", Array.from(responsavelIds));

    if (respError) throw respError;

    const responsavelMap = new Map(
      (responsaveis || []).map((item) => [item.idpessoa, item])
    );

    normalizeArray(data.Andamento).forEach((andamento) => {
      const responsavelId =
        andamento?.responsavelId ?? andamento?.responsavelid ?? null;
      const responsavel = responsavelMap.get(responsavelId);
      if (responsavel) andamento.responsavel = responsavel;
    });

    normalizeArray(data.Publicacao).forEach((pub) => {
      normalizeArray(pub?.Prazo).forEach((prazo) => {
        const responsavelId =
          prazo?.responsavelId ?? prazo?.responsavelid ?? null;
        const responsavel = responsavelMap.get(responsavelId);
        if (responsavel) prazo.responsavel = responsavel;
      });
    });
  }

  return data;
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
  const payload = injectTenant(dados, tenantId);

  // Remove campos de controle interno que não vão pro banco
  delete payload.processoId;

  // Passo 1: Criar Publicação Manual
  const publicacaoPayload = {
    processoid: dados.processoId,
    data_publicacao: new Date(),
    texto_integral: dados.descricao, // Salva apenas a descrição pura, sem prefixos, conforme solicitado
    tenant_id: tenantId
  };

  const { data: pubData, error: pubError } = await supabase
    .from("Publicacao")
    .insert([publicacaoPayload])
    .select()
    .single();

  if (pubError) throw pubError;

  // Passo 2: Criar o Prazo linkado
  const prazoPayload = {
    descricao: "Prazo Manual", // Salva fixo como solicitado
    data_limite: dados.data_limite,
    publicacaoid: pubData.id,
    responsavelId: dados.responsavelId ? dados.responsavelId : null,
    tenant_id: tenantId
  };

  const { data, error } = await supabase
    .from("Prazo")
    .insert([prazoPayload])
    .select()
    .single();

  if (error) throw error;
  return data;
};