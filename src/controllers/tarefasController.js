import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";
import { assignTask, getTaskById, listTasks } from "../services/tarefasService.js";

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function validateAssignPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return ["Payload inválido."];
  }

  if (!("responsavel_id" in payload) && !("revisor_id" in payload)) {
    return ["responsavel_id ou revisor_id é obrigatório."];
  }

  if (
    "responsavel_id" in payload &&
    payload.responsavel_id !== null &&
    !normalizeString(payload.responsavel_id)
  ) {
    errors.push("responsavel_id deve ser string ou null.");
  }

  if (
    "revisor_id" in payload &&
    payload.revisor_id !== null &&
    !normalizeString(payload.revisor_id)
  ) {
    errors.push("revisor_id deve ser string ou null.");
  }

  return errors;
}

export const list = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const items = await listTasks(req.query, req.tenantId);
    return res.status(200).json(items);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.list_error", "Erro ao listar tarefas", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      query: req.query,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const getDetails = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  if (!taskId) {
    logWarn("tarefas.controller.details_validation", "id é obrigatório.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "id é obrigatório." });
  }

  try {
    const task = await getTaskById(taskId, req.tenantId);
    return res.status(200).json(task);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.details_error", "Erro ao buscar tarefa", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const assign = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  if (!taskId) {
    logWarn("tarefas.controller.assign_validation", "id é obrigatório.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "id é obrigatório." });
  }

  const errors = validateAssignPayload(req.body);
  if (errors.length) {
    logWarn("tarefas.controller.assign_invalid", "Payload inválido.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      errors,
    });
    return res.status(400).json({ error: "Payload inválido.", details: errors });
  }

  try {
    const task = await assignTask({
      taskId,
      tenantId: req.tenantId,
      assigneeId: req.body.responsavel_id,
      reviewerId: req.body.revisor_id,
    });
    return res.status(200).json(task);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.assign_error", "Erro ao atribuir tarefa", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};
