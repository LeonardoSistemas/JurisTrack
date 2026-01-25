import pool from "../config/postgresClient.js";

const PRIORITY_CRITICAL = "Crítico";
const PRIORITY_WARNING = "Atenção";
const PRIORITY_OK = "Tranquilo";

function assertTenantId(tenantId) {
  if (!tenantId) {
    const error = new Error("tenantId é obrigatório.");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function buildPrioritySql() {
  return `
    case
      when t.data_limite <= current_date then '${PRIORITY_CRITICAL}'
      when t.data_limite <= (current_date + interval '3 days') then '${PRIORITY_WARNING}'
      else '${PRIORITY_OK}'
    end
  `;
}

function mapTaskRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    data_limite: row.data_limite,
    prioridade: row.prioridade,
    status: row.status_id
      ? {
          id: row.status_id,
          nome: row.status_nome,
          cor_hex: row.status_cor_hex,
        }
      : null,
    processo: row.processo_id
      ? {
          id: row.processo_id,
          numero: row.numero_processo,
          assunto: row.processo_assunto ?? null,
          pasta: row.processo_pasta ?? null,
        }
      : null,
    evento: row.evento_id
      ? {
          id: row.evento_id,
          nome: row.evento_nome,
          descricao: row.evento_descricao ?? null,
        }
      : null,
    providencia: row.providencia_id
      ? {
          id: row.providencia_id,
          nome: row.providencia_nome,
          descricao: row.providencia_descricao ?? null,
        }
      : null,
    responsavel: row.responsavel_id
      ? {
          id: row.responsavel_id,
          nome: row.responsavel_nome,
        }
      : null,
    revisor: row.revisor_id
      ? {
          id: row.revisor_id,
          nome: row.revisor_nome,
        }
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildListFilters(filters = {}) {
  const assigneeId = normalizeString(filters.responsavel_id);
  const statusId = normalizeString(filters.status_id);
  const statusName = normalizeString(filters.status);
  const searchTerm = normalizeString(filters.busca || filters.numero_processo);

  return {
    assigneeId,
    statusId,
    statusName,
    searchTerm,
  };
}

export async function listTasks(filters, tenantId) {
  assertTenantId(tenantId);
  const { assigneeId, statusId, statusName, searchTerm } =
    buildListFilters(filters);

  const params = [tenantId];
  const conditions = ["t.tenant_id = $1", "p.tenant_id = $1"];

  if (assigneeId) {
    params.push(assigneeId);
    conditions.push(`t.responsavel_id = $${params.length}`);
  }

  if (statusId) {
    params.push(statusId);
    conditions.push(`t.status_id = $${params.length}`);
  } else if (statusName) {
    params.push(statusName);
    conditions.push(`lower(s.nome) = lower($${params.length})`);
  }

  if (searchTerm) {
    params.push(`%${searchTerm}%`);
    conditions.push(`p.numprocesso ilike $${params.length}`);
  }

  const prioritySql = buildPrioritySql();
  const query = `
    select
      t.id,
      t.processo_id,
      p.numprocesso as numero_processo,
      t.evento_id,
      e.nome as evento_nome,
      t.providencia_id,
      pj.nome as providencia_nome,
      t.responsavel_id,
      resp.nome as responsavel_nome,
      t.revisor_id,
      rev.nome as revisor_nome,
      t.status_id,
      s.nome as status_nome,
      s.cor_hex as status_cor_hex,
      t.data_limite,
      t.created_at,
      t.updated_at,
      ${prioritySql} as prioridade
    from tarefa_fila_trabalho t
    inner join processos p on p.idprocesso = t.processo_id
    inner join evento_processual e on e.id = t.evento_id
    inner join providencia_juridica pj on pj.id = t.providencia_id
    inner join aux_status s on s.id = t.status_id
    left join users resp on resp.id = t.responsavel_id
    left join users rev on rev.id = t.revisor_id
    where ${conditions.join(" and ")}
    order by t.data_limite asc, t.created_at asc
  `;

  const { rows } = await pool.query(query, params);
  return rows.map((row) => mapTaskRow(row));
}

export async function getTaskById(taskId, tenantId) {
  assertTenantId(tenantId);
  if (!taskId) {
    const error = new Error("id da tarefa é obrigatório.");
    error.statusCode = 400;
    throw error;
  }

  const prioritySql = buildPrioritySql();
  const { rows } = await pool.query(
    `
      select
        t.id,
        t.processo_id,
        p.numprocesso as numero_processo,
        p.assunto as processo_assunto,
        p.pasta as processo_pasta,
        t.evento_id,
        e.nome as evento_nome,
        e.descricao as evento_descricao,
        t.providencia_id,
        pj.nome as providencia_nome,
        pj.descricao as providencia_descricao,
        t.responsavel_id,
        resp.nome as responsavel_nome,
        t.revisor_id,
        rev.nome as revisor_nome,
        t.status_id,
        s.nome as status_nome,
        s.cor_hex as status_cor_hex,
        t.data_limite,
        t.created_at,
        t.updated_at,
        ${prioritySql} as prioridade
      from tarefa_fila_trabalho t
      inner join processos p on p.idprocesso = t.processo_id
      inner join evento_processual e on e.id = t.evento_id
      inner join providencia_juridica pj on pj.id = t.providencia_id
      inner join aux_status s on s.id = t.status_id
      left join users resp on resp.id = t.responsavel_id
      left join users rev on rev.id = t.revisor_id
      where t.id = $1
        and t.tenant_id = $2
        and p.tenant_id = $2
      limit 1
    `,
    [taskId, tenantId]
  );

  if (!rows.length) {
    const error = new Error("Tarefa não encontrada.");
    error.statusCode = 404;
    throw error;
  }

  return mapTaskRow(rows[0]);
}

export async function assignTask({ taskId, tenantId, assigneeId, reviewerId }) {
  assertTenantId(tenantId);
  if (!taskId) {
    const error = new Error("id da tarefa é obrigatório.");
    error.statusCode = 400;
    throw error;
  }

  const payload = {};

  if (assigneeId !== undefined) {
    payload.responsavel_id = assigneeId;
  }

  if (reviewerId !== undefined) {
    payload.revisor_id = reviewerId;
  }

  if (!Object.keys(payload).length) {
    const error = new Error("Nada para atualizar.");
    error.statusCode = 400;
    throw error;
  }

  payload.updated_at = new Date();

  const fields = Object.keys(payload);
  const params = [taskId, tenantId];
  const setClauses = fields.map((field, index) => {
    params.push(payload[field]);
    return `${field} = $${index + 3}`;
  });

  const { rowCount } = await pool.query(
    `
      update tarefa_fila_trabalho
      set ${setClauses.join(", ")}
      where id = $1
        and tenant_id = $2
    `,
    params
  );

  if (!rowCount) {
    const error = new Error("Tarefa não encontrada para atualização.");
    error.statusCode = 404;
    throw error;
  }

  return getTaskById(taskId, tenantId);
}
