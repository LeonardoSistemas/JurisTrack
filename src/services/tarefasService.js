import pool from "../config/postgresClient.js";
import { uploadFileToProcessoDoc } from "./uploadService.js";

const PRIORITY_CRITICAL = "Crítico";
const PRIORITY_WARNING = "Atenção";
const PRIORITY_OK = "Tranquilo";
const STATUS_DOMAIN = "tarefa_fila_trabalho";

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

function normalizeStatusName(statusName) {
  if (typeof statusName !== "string") return null;
  const trimmed = statusName.trim();
  return trimmed.length ? trimmed.toLowerCase() : null;
}

function buildStatusTransitionMap() {
  return {
    aguardando: ["em elaboração"],
    "em elaboração": ["em revisão", "pronto para protocolo"],
    "em revisão": ["pronto para protocolo"],
    "pronto para protocolo": ["protocolado"],
    protocolado: [],
  };
}

function assertTaskId(taskId) {
  if (!taskId) {
    const error = new Error("taskId is required.");
    error.statusCode = 400;
    throw error;
  }
}

function assertChecklistItemId(itemId) {
  if (!itemId) {
    const error = new Error("checklistItemId is required.");
    error.statusCode = 400;
    throw error;
  }
}

function assertChecklistTitle(title) {
  if (typeof title !== "string" || !title.trim()) {
    const error = new Error("title is required.");
    error.statusCode = 400;
    throw error;
  }
}

function assertChecklistDoneFlag(done) {
  if (typeof done !== "boolean") {
    const error = new Error("done must be a boolean.");
    error.statusCode = 400;
    throw error;
  }
}

async function fetchTaskProcessId(taskId, tenantId) {
  const { rows } = await pool.query(
    `
      select t.processo_id
      from tarefa_fila_trabalho t
      inner join processos p on p.idprocesso = t.processo_id
      where t.id = $1
        and t.tenant_id = $2
        and p.tenant_id = $2
      limit 1
    `,
    [taskId, tenantId]
  );

  return rows?.[0]?.processo_id ?? null;
}

async function fetchTaskProtocolData(taskId, tenantId) {
  const { rows } = await pool.query(
    `
      select
        t.id,
        t.status_id,
        s.nome as status_nome,
        t.revisor_id,
        t.processo_id,
        p.numprocesso as numero_processo
      from tarefa_fila_trabalho t
      inner join aux_status s on s.id = t.status_id
      inner join processos p on p.idprocesso = t.processo_id
      where t.id = $1
        and t.tenant_id = $2
        and p.tenant_id = $2
      limit 1
    `,
    [taskId, tenantId]
  );

  return rows?.[0] ?? null;
}

async function assertChecklistCompleted(taskId, tenantId) {
  const { rows } = await pool.query(
    `
      select count(1)::int as pending
      from tarefa_checklist_item
      where tarefa_id = $1
        and tenant_id = $2
        and obrigatorio = true
        and concluido = false
    `,
    [taskId, tenantId]
  );

  const pending = rows?.[0]?.pending ?? 0;
  if (pending > 0) {
    const error = new Error("Checklist required items are not complete.");
    error.statusCode = 422;
    throw error;
  }
}

function normalizeChecklistPayload(payload) {
  const title = typeof payload?.titulo === "string" ? payload.titulo.trim() : "";
  const order =
    payload?.ordem === null || payload?.ordem === undefined
      ? null
      : Number(payload.ordem);
  const isRequired =
    payload?.obrigatorio === undefined ? true : Boolean(payload.obrigatorio);

  return {
    title,
    order: Number.isNaN(order) ? null : order,
    isRequired,
  };
}

async function fetchTaskSnapshot(taskId, tenantId) {
  const { rows } = await pool.query(
    `
      select
        t.id,
        t.status_id,
        s.nome as status_nome,
        t.revisor_id
      from tarefa_fila_trabalho t
      inner join aux_status s on s.id = t.status_id
      where t.id = $1
        and t.tenant_id = $2
      limit 1
    `,
    [taskId, tenantId]
  );

  return rows?.[0] ?? null;
}

async function assertTaskExists(taskId, tenantId) {
  const { rows } = await pool.query(
    `
      select id
      from tarefa_fila_trabalho
      where id = $1
        and tenant_id = $2
      limit 1
    `,
    [taskId, tenantId]
  );

  if (!rows.length) {
    const error = new Error("Task not found.");
    error.statusCode = 404;
    throw error;
  }
}

async function fetchStatusByPayload({ statusId, statusName }) {
  if (!statusId && !statusName) {
    const error = new Error("status_id or status is required.");
    error.statusCode = 400;
    throw error;
  }

  if (statusId && typeof statusId !== "string") {
    const error = new Error("status_id must be a string.");
    error.statusCode = 400;
    throw error;
  }

  if (statusName && typeof statusName !== "string") {
    const error = new Error("status must be a string.");
    error.statusCode = 400;
    throw error;
  }

  const { rows } = await pool.query(
    `
      select id, nome
      from aux_status
      where dominio = $1
        and ativo = true
        and (
          ($2::uuid is not null and id = $2::uuid)
          or ($3::text is not null and lower(nome) = lower($3::text))
        )
      limit 1
    `,
    [STATUS_DOMAIN, statusId ?? null, statusName ?? null]
  );

  if (!rows.length) {
    const error = new Error("Status not found.");
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
}

function assertValidTransition({ currentStatus, targetStatus, reviewerId }) {
  const normalizedCurrent = normalizeStatusName(currentStatus);
  const normalizedTarget = normalizeStatusName(targetStatus);

  if (!normalizedCurrent || !normalizedTarget) {
    const error = new Error("Invalid status transition.");
    error.statusCode = 422;
    throw error;
  }

  if (normalizedCurrent === normalizedTarget) {
    return;
  }

  if (
    normalizedCurrent === "em elaboração" &&
    normalizedTarget === "pronto para protocolo" &&
    !reviewerId
  ) {
    return;
  }

  const transitions = buildStatusTransitionMap();
  const allowedTargets = transitions[normalizedCurrent] ?? [];

  if (!allowedTargets.includes(normalizedTarget)) {
    const error = new Error("Status transition not allowed.");
    error.statusCode = 422;
    throw error;
  }
}

function mapChecklistRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tarefa_id: row.tarefa_id,
    titulo: row.titulo,
    ordem: row.ordem,
    concluido: row.concluido,
    obrigatorio: row.obrigatorio,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
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
  assertTaskId(taskId);

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
  assertTaskId(taskId);

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

export async function listChecklistItems({ taskId, tenantId }) {
  assertTenantId(tenantId);
  assertTaskId(taskId);

  await assertTaskExists(taskId, tenantId);

  const { rows } = await pool.query(
    `
      select
        id,
        tarefa_id,
        titulo,
        ordem,
        concluido,
        obrigatorio,
        created_at,
        updated_at
      from tarefa_checklist_item
      where tarefa_id = $1
        and tenant_id = $2
      order by ordem asc, created_at asc
    `,
    [taskId, tenantId]
  );

  return rows.map((row) => mapChecklistRow(row));
}

export async function updateChecklistItem({
  taskId,
  checklistItemId,
  tenantId,
  done,
}) {
  assertTenantId(tenantId);
  assertTaskId(taskId);
  assertChecklistItemId(checklistItemId);
  assertChecklistDoneFlag(done);

  const { rows } = await pool.query(
    `
      update tarefa_checklist_item
      set concluido = $1,
          updated_at = $2
      where id = $3
        and tarefa_id = $4
        and tenant_id = $5
      returning
        id,
        tarefa_id,
        titulo,
        ordem,
        concluido,
        obrigatorio,
        created_at,
        updated_at
    `,
    [done, new Date(), checklistItemId, taskId, tenantId]
  );

  if (!rows.length) {
    const error = new Error("Checklist item not found.");
    error.statusCode = 404;
    throw error;
  }

  return mapChecklistRow(rows[0]);
}

export async function createChecklistItem({ taskId, tenantId, payload }) {
  assertTenantId(tenantId);
  assertTaskId(taskId);

  const normalized = normalizeChecklistPayload(payload);
  assertChecklistTitle(normalized.title);

  await assertTaskExists(taskId, tenantId);

  const { rows } = await pool.query(
    `
      insert into tarefa_checklist_item
        (tarefa_id, titulo, ordem, obrigatorio, tenant_id)
      values ($1, $2, $3, $4, $5)
      returning
        id,
        tarefa_id,
        titulo,
        ordem,
        concluido,
        obrigatorio,
        created_at,
        updated_at
    `,
    [
      taskId,
      normalized.title,
      normalized.order ?? 0,
      normalized.isRequired,
      tenantId,
    ]
  );

  return mapChecklistRow(rows[0]);
}

export async function deleteChecklistItem({
  taskId,
  checklistItemId,
  tenantId,
}) {
  assertTenantId(tenantId);
  assertTaskId(taskId);
  assertChecklistItemId(checklistItemId);

  const { rows } = await pool.query(
    `
      delete from tarefa_checklist_item
      where id = $1
        and tarefa_id = $2
        and tenant_id = $3
      returning id
    `,
    [checklistItemId, taskId, tenantId]
  );

  if (!rows.length) {
    const error = new Error("Checklist item not found.");
    error.statusCode = 404;
    throw error;
  }

  return { success: true };
}

export async function updateTaskStatus({ taskId, tenantId, payload }) {
  assertTenantId(tenantId);
  assertTaskId(taskId);

  const statusId = payload?.status_id ?? null;
  const statusName = payload?.status ?? null;

  const [task, targetStatus] = await Promise.all([
    fetchTaskSnapshot(taskId, tenantId),
    fetchStatusByPayload({ statusId, statusName }),
  ]);

  if (!task) {
    const error = new Error("Task not found.");
    error.statusCode = 404;
    throw error;
  }

  assertValidTransition({
    currentStatus: task.status_nome,
    targetStatus: targetStatus.nome,
    reviewerId: task.revisor_id,
  });

  if (task.status_id === targetStatus.id) {
    return getTaskById(taskId, tenantId);
  }

  await pool.query(
    `
      update tarefa_fila_trabalho
      set status_id = $1,
          updated_at = $2
      where id = $3
        and tenant_id = $4
    `,
    [targetStatus.id, new Date(), taskId, tenantId]
  );

  return getTaskById(taskId, tenantId);
}

export async function protocolTask({ taskId, tenantId, file }) {
  assertTenantId(tenantId);
  assertTaskId(taskId);

  if (!file) {
    const error = new Error("file is required.");
    error.statusCode = 400;
    throw error;
  }

  const [task, targetStatus] = await Promise.all([
    fetchTaskProtocolData(taskId, tenantId),
    fetchStatusByPayload({ statusId: null, statusName: "Protocolado" }),
  ]);

  if (!task) {
    const error = new Error("Task not found.");
    error.statusCode = 404;
    throw error;
  }

  if (normalizeStatusName(task.status_nome) === "protocolado") {
    const error = new Error("Task already protocolado.");
    error.statusCode = 422;
    throw error;
  }

  assertValidTransition({
    currentStatus: task.status_nome,
    targetStatus: targetStatus.nome,
    reviewerId: task.revisor_id,
  });

  await assertChecklistCompleted(taskId, tenantId);

  const uploadResult = await uploadFileToProcessoDoc(
    file,
    task.numero_processo,
    task.processo_id,
    tenantId
  );

  await pool.query(
    `
      update tarefa_fila_trabalho
      set status_id = $1,
          updated_at = $2
      where id = $3
        and tenant_id = $4
    `,
    [targetStatus.id, new Date(), taskId, tenantId]
  );

  return {
    task: await getTaskById(taskId, tenantId),
    documento: uploadResult,
  };
}

export async function listPublicacoesByTaskId({ taskId, tenantId, limit = 20 }) {
  assertTenantId(tenantId);
  assertTaskId(taskId);

  const processoId = await fetchTaskProcessId(taskId, tenantId);
  if (!processoId) {
    const error = new Error("Tarefa não encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

  const { rows } = await pool.query(
    `
      select
        id,
        texto_integral,
        data_publicacao
      from "Publicacao"
      where processoid = $1
        and tenant_id = $2
      order by data_publicacao desc nulls last
      limit $3::int
    `,
    [processoId, tenantId, safeLimit]
  );

  return rows.map((row) => ({
    id: row.id,
    texto_integral: row.texto_integral,
    data_publicacao: row.data_publicacao,
  }));
}

export async function listAndamentosByTaskId({ taskId, tenantId, limit = 20 }) {
  assertTenantId(tenantId);
  assertTaskId(taskId);

  const processoId = await fetchTaskProcessId(taskId, tenantId);
  if (!processoId) {
    const error = new Error("Tarefa não encontrada.");
    error.statusCode = 404;
    throw error;
  }

  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 20;

  const { rows } = await pool.query(
    `
      select
        id,
        descricao,
        data_evento
      from "Andamento"
      where "processoId" = $1
        and tenant_id = $2
      order by data_evento desc nulls last
      limit $3::int
    `,
    [processoId, tenantId, safeLimit]
  );

  return rows.map((row) => ({
    id: row.id,
    descricao: row.descricao,
    data_evento: row.data_evento,
  }));
}
