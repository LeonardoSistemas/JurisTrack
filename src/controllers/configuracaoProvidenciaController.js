import * as configuracaoProvidenciaService from "../services/configuracaoProvidenciaService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError } from "../utils/logger.js";

export const listProvidencias = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const providencias = await configuracaoProvidenciaService.listProvidencias({
      tenantId: req.tenantId,
      search: req.query?.busca,
      status: req.query?.status,
    });
    return res.status(200).json(providencias);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.list_error",
      "Failed to list providencias.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const createProvidencia = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.createProvidencia({
      tenantId: req.tenantId,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.create_error",
      "Failed to create providencia.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const updateProvidencia = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.updateProvidencia({
      tenantId: req.tenantId,
      providenciaId: req.params?.id,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.update_error",
      "Failed to update providencia.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const listChecklistItems = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const items = await configuracaoProvidenciaService.listChecklistItems({
      tenantId: req.tenantId,
      providenciaId: req.params?.id,
    });
    return res.status(200).json(items);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.checklist_list_error",
      "Failed to list checklist items.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const createChecklistItem = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.createChecklistItem({
      tenantId: req.tenantId,
      providenciaId: req.params?.id,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.checklist_create_error",
      "Failed to create checklist item.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const updateChecklistItem = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.updateChecklistItem({
      tenantId: req.tenantId,
      checklistItemId: req.params?.itemId,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.checklist_update_error",
      "Failed to update checklist item.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const deleteChecklistItem = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.deleteChecklistItem({
      tenantId: req.tenantId,
      checklistItemId: req.params?.itemId,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.checklist_delete_error",
      "Failed to delete checklist item.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const listProvidenciaModels = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const models = await configuracaoProvidenciaService.listProvidenciaModels({
      tenantId: req.tenantId,
      providenciaId: req.params?.id,
    });
    return res.status(200).json(models);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.models_list_error",
      "Failed to list providencia models.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const addProvidenciaModel = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.addProvidenciaModel({
      tenantId: req.tenantId,
      providenciaId: req.params?.id,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.models_add_error",
      "Failed to add providencia model.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const removeProvidenciaModel = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoProvidenciaService.removeProvidenciaModel({
      tenantId: req.tenantId,
      providenciaId: req.params?.id,
      modeloId: req.params?.modeloId,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError(
      "config-providencia.controller.models_remove_error",
      "Failed to remove providencia model.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};
