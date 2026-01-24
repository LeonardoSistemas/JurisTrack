import * as configuracaoEventoService from "../services/configuracaoEventoService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError } from "../utils/logger.js";

export const listEvents = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const events = await configuracaoEventoService.listEvents({
      tenantId: req.tenantId,
      search: req.query?.busca,
      status: req.query?.status,
    });
    return res.status(200).json(events);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError("config-event.controller.list_error", "Failed to list events.", {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const createEvent = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoEventoService.createEvent({
      tenantId: req.tenantId,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError("config-event.controller.create_error", "Failed to create event.", {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const updateEvent = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoEventoService.updateEvent({
      tenantId: req.tenantId,
      eventId: req.params?.id,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 500;
    logError("config-event.controller.update_error", "Failed to update event.", {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(status).json({ error: error.message || "Internal server error." });
  }
};

export const listMappings = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const mappings = await configuracaoEventoService.listMappings({
      tenantId: req.tenantId,
    });
    return res.status(200).json(mappings);
  } catch (error) {
    logError("config-event.controller.mappings_error", "Failed to list mappings.", {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const createMapping = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const result = await configuracaoEventoService.createMapping({
      tenantId: req.tenantId,
      payload: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    logError(
      "config-event.controller.mappings_create_error",
      "Failed to create mapping.",
      {
        error,
        tenantId: req.tenantId,
        userId: req.user?.id,
      }
    );
    return res.status(500).json({ error: "Internal server error." });
  }
};
