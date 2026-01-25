import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";
import {
  assignTask,
  createChecklistItem,
  deleteChecklistItem,
  getTaskById,
  listChecklistItems,
  listTasks,
  updateChecklistItem,
  updateTaskStatus,
} from "../services/tarefasService.js";

function normalizeString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function validateChecklistUpdatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return ["Payload inválido."];
  }

  if (typeof payload.concluido !== "boolean") {
    return ["concluido deve ser boolean."];
  }

  return [];
}

function validateChecklistCreatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return ["Payload inválido."];
  }

  if (!normalizeString(payload.titulo)) {
    errors.push("titulo é obrigatório.");
  }

  if (
    payload.ordem !== undefined &&
    payload.ordem !== null &&
    Number.isNaN(Number(payload.ordem))
  ) {
    errors.push("ordem deve ser numérico.");
  }

  if (payload.obrigatorio !== undefined && typeof payload.obrigatorio !== "boolean") {
    errors.push("obrigatorio deve ser boolean.");
  }

  return errors;
}

function validateStatusPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return ["Payload inválido."];
  }

  if (!("status_id" in payload) && !("status" in payload)) {
    return ["status_id ou status é obrigatório."];
  }

  if ("status_id" in payload && payload.status_id !== null && !normalizeString(payload.status_id)) {
    return ["status_id deve ser string."];
  }

  if ("status" in payload && payload.status !== null && !normalizeString(payload.status)) {
    return ["status deve ser string."];
  }

  return [];
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

export const listChecklist = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  if (!taskId) {
    logWarn("tarefas.controller.checklist_validation", "id is required.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "id is required." });
  }

  try {
    const items = await listChecklistItems({
      taskId,
      tenantId: req.tenantId,
    });
    return res.status(200).json(items);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.checklist_list_error", "Failed to list checklist.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const updateChecklist = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  const checklistItemId = req.params?.itemId;
  if (!taskId || !checklistItemId) {
    logWarn("tarefas.controller.checklist_update_validation", "id is required.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      checklistItemId,
    });
    return res.status(400).json({ error: "id is required." });
  }

  const errors = validateChecklistUpdatePayload(req.body);
  if (errors.length) {
    logWarn("tarefas.controller.checklist_update_invalid", "Payload inválido.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      errors,
    });
    return res.status(400).json({ error: "Payload inválido.", details: errors });
  }

  try {
    const item = await updateChecklistItem({
      taskId,
      checklistItemId,
      tenantId: req.tenantId,
      done: req.body.concluido,
    });
    return res.status(200).json(item);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.checklist_update_error", "Failed to update checklist.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      checklistItemId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const createChecklist = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  if (!taskId) {
    logWarn("tarefas.controller.checklist_create_validation", "id is required.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "id is required." });
  }

  const errors = validateChecklistCreatePayload(req.body);
  if (errors.length) {
    logWarn("tarefas.controller.checklist_create_invalid", "Payload inválido.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      errors,
    });
    return res.status(400).json({ error: "Payload inválido.", details: errors });
  }

  try {
    const item = await createChecklistItem({
      taskId,
      tenantId: req.tenantId,
      payload: req.body,
    });
    return res.status(200).json(item);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.checklist_create_error", "Failed to create checklist.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const deleteChecklist = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  const checklistItemId = req.params?.itemId;
  if (!taskId || !checklistItemId) {
    logWarn("tarefas.controller.checklist_delete_validation", "id is required.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      checklistItemId,
    });
    return res.status(400).json({ error: "id is required." });
  }

  try {
    const result = await deleteChecklistItem({
      taskId,
      checklistItemId,
      tenantId: req.tenantId,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.checklist_delete_error", "Failed to delete checklist.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      checklistItemId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const updateStatus = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const taskId = req.params?.id;
  if (!taskId) {
    logWarn("tarefas.controller.status_validation", "id is required.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "id is required." });
  }

  const errors = validateStatusPayload(req.body);
  if (errors.length) {
    logWarn("tarefas.controller.status_invalid", "Payload inválido.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      errors,
    });
    return res.status(400).json({ error: "Payload inválido.", details: errors });
  }

  try {
    const task = await updateTaskStatus({
      taskId,
      tenantId: req.tenantId,
      payload: req.body,
    });
    return res.status(200).json(task);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("tarefas.controller.status_error", "Failed to update task status.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      taskId,
      error,
    });
    return res.status(status).json({ error: error.message });
  }
};
