import supabase from "../config/supabase.js";
import { withTenantFilter } from "../repositories/tenantScope.js";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function datePlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function applyPagination(query, { limit, offset } = {}) {
  const parsedLimit = Number.isInteger(limit) && limit > 0 ? limit : null;
  const parsedOffset = Number.isInteger(offset) && offset >= 0 ? offset : null;

  if (parsedLimit && parsedOffset !== null) {
    return query.range(parsedOffset, parsedOffset + parsedLimit - 1);
  }

  if (parsedLimit) {
    return query.limit(parsedLimit);
  }

  return query;
}

async function countProcessosAtivos(tenantId) {
  const { count, error } = await withTenantFilter("processos", tenantId)
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);
  if (error) throw error;
  return count || 0;
}

async function sumValorCausa(tenantId) {
  const { data, error } = await withTenantFilter("processos", tenantId)
    .select("valor_causa")
    .is("deleted_at", null);
  if (error) throw error;
  if (!data || data.length === 0) return 0;
  return data.reduce((total, item) => {
    const value = Number(item?.valor_causa) || 0;
    return total + value;
  }, 0);
}

async function countPrazosUrgentes(tenantId) {
  const start = todayDate();
  const end = datePlusDays(7);
  const { count, error } = await withTenantFilter("Prazo", tenantId)
    .select("*", { count: "exact", head: true })
    .gte("data_limite", start)
    .lte("data_limite", end);
  if (error) throw error;
  return count || 0;
}

async function countAndamentosRecentes(tenantId) {
  const end = todayDate();
  const start = datePlusDays(-7);
  const { count, error } = await withTenantFilter("Andamento", tenantId)
    .select("*", { count: "exact", head: true })
    .gte("data_evento", start)
    .lte("data_evento", end);
  if (error) throw error;
  return count || 0;
}

function aggregateByLabel(rows, labelSelector, topN = null) {
  const map = new Map();
  for (const row of rows || []) {
    const label = labelSelector(row) || "Não informado";
    map.set(label, (map.get(label) || 0) + 1);
  }
  const list = Array.from(map.entries()).map(([label, count]) => ({
    label,
    count,
  }));
  list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return topN ? list.slice(0, topN) : list;
}

async function loadDistribuicoes(tenantId) {
  const { data, error } = await withTenantFilter("processos", tenantId)
    .select(
      `
      idprocesso,
      idsituacao,
      situacoes ( descricao ),
      idfase,
      fases ( descricao ),
      idtribunal,
      tribunais ( descricao )
    `
    )
    .is("deleted_at", null);
  if (error) throw error;

  const distribuicaoSituacao = aggregateByLabel(
    data,
    (row) => row?.situacoes?.descricao
  );
  const distribuicaoFase = aggregateByLabel(
    data,
    (row) => row?.fases?.descricao
  );
  const topTribunais = aggregateByLabel(
    data,
    (row) => row?.tribunais?.descricao,
    5
  );

  return { distribuicaoSituacao, distribuicaoFase, topTribunais };
}

export async function getSummary(tenantId) {
  const [
    totalProcessos,
    valorCausaTotal,
    prazosUrgentesCount,
    andamentosRecentesCount,
    distrib,
  ] = await Promise.all([
    countProcessosAtivos(tenantId),
    sumValorCausa(tenantId),
    countPrazosUrgentes(tenantId),
    countAndamentosRecentes(tenantId),
    loadDistribuicoes(tenantId),
  ]);

  return {
    totalProcessos,
    valorCausaTotal,
    prazosUrgentesCount,
    andamentosRecentesCount,
    distribuicaoSituacao: distrib.distribuicaoSituacao,
    distribuicaoFase: distrib.distribuicaoFase,
    topTribunais: distrib.topTribunais,
  };
}

export async function getPrazosDetalhes(tenantId, options = {}) {
  const start = todayDate();
  const end = datePlusDays(7);

  let prazosQuery = withTenantFilter("Prazo", tenantId)
    .select("id, descricao, data_limite, processoid, status_id")
    .gte("data_limite", start)
    .lte("data_limite", end)
    .order("data_limite", { ascending: true });

  prazosQuery = applyPagination(prazosQuery, options);

  const { data: prazos, error } = await prazosQuery;

  if (error) throw error;
  if (!prazos || prazos.length === 0) return { items: [] };

  const processIds = Array.from(
    new Set(
      prazos
        .map((p) => p.processoid)
        .filter(Boolean)
    )
  );

  let processos = [];
  if (processIds.length > 0) {
    const { data: procs, error: procError } = await withTenantFilter(
      "processos",
      tenantId
    )
      .select("idprocesso, numprocesso")
      .in("idprocesso", processIds)
      .is("deleted_at", null);
    if (procError) throw procError;
    processos = procs || [];
  }

  const statusIds = Array.from(
    new Set(
      prazos
        .map((p) => p.status_id)
        .filter(Boolean)
    )
  );

  let statuses = [];
  if (statusIds.length > 0) {
    const { data: statusData, error: statusError } = await supabase
      .from("aux_status")
      .select("id, nome, dominio")
      .in("id", statusIds);
    if (statusError) throw statusError;
    statuses = statusData || [];
  }

  const procById = new Map(
    processos.map((proc) => [proc.idprocesso, proc.numprocesso])
  );
  const statusById = new Map(
    statuses.map((status) => [status.id, status])
  );

  const items = prazos
    .map((p) => {
      const numeroProcesso = procById.get(p.processoid);
      if (!numeroProcesso) return null;
      return {
        numeroProcesso,
        descricao: p.descricao || null,
        data_limite: p.data_limite || null,
        status_id: p.status_id || null,
        status: statusById.get(p.status_id) || null,
      };
    })
    .filter(Boolean);

  return { items };
}

export async function getAndamentosDetalhes(tenantId, options = {}) {
  const end = todayDate();
  const start = datePlusDays(-7);

  let andamentosQuery = withTenantFilter("Andamento", tenantId)
    .select("id, processoId, processoid, descricao, data_evento")
    .gte("data_evento", start)
    .lte("data_evento", end)
    .order("data_evento", { ascending: false });

  andamentosQuery = applyPagination(andamentosQuery, options);

  const { data: andamentos, error } = await andamentosQuery;

  if (error) throw error;
  if (!andamentos || andamentos.length === 0) return { items: [] };

  const processIds = Array.from(
    new Set(
      andamentos
        .map((a) => a.processoId || a.processoid)
        .filter(Boolean)
    )
  );

  let processos = [];
  if (processIds.length > 0) {
    const { data: procs, error: procError } = await withTenantFilter(
      "processos",
      tenantId
    )
      .select("idprocesso, numprocesso")
      .in("idprocesso", processIds)
      .is("deleted_at", null);
    if (procError) throw procError;
    processos = procs || [];
  }

  const procById = new Map(
    processos.map((proc) => [proc.idprocesso, proc.numprocesso])
  );

  const items = andamentos
    .map((a) => {
      const procId = a.processoId || a.processoid;
      const numeroProcesso = procById.get(procId);
      if (!numeroProcesso) return null;
      return {
        numeroProcesso,
        descricao: a.descricao || null,
        data_evento: a.data_evento || null,
      };
    })
    .filter(Boolean);

  return { items };
}

