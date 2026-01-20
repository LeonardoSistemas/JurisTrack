import {
  confirmarAnaliseEventoProvidencia,
  getSugestaoEventoProvidencia,
} from "../services/eventoProvidenciaService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateConfirmPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["Payload inválido."];
  }

  const { idItem, evento_id, providencia_id, prazo_final, modelo_id, observacao } = payload;

  if (!isNonEmptyString(idItem)) {
    errors.push("idItem é obrigatório.");
  }

  if (!isNonEmptyString(evento_id)) {
    errors.push("evento_id é obrigatório.");
  }

  if (!isNonEmptyString(providencia_id)) {
    errors.push("providencia_id é obrigatório.");
  }

  if (
    prazo_final != null &&
    typeof prazo_final !== "string" &&
    typeof prazo_final !== "object"
  ) {
    errors.push("prazo_final deve ser string ou objeto.");
  }

  if (modelo_id != null && !isNonEmptyString(modelo_id)) {
    errors.push("modelo_id deve ser string.");
  }

  if (observacao != null && typeof observacao !== "string") {
    errors.push("observacao deve ser string.");
  }

  return errors;
}

export const getSugestao = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const { idItem } = req.params || {};
  const { evento_id: eventoId } = req.query || {};
  if (!idItem) {
    logWarn("evento.controller.sugestao_validation", "idItem é obrigatório.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "idItem é obrigatório." });
  }

  try {
    const sugestao = await getSugestaoEventoProvidencia({
      itemId: idItem,
      tenantId: req.tenantId,
      eventoId: eventoId || null,
    });
    return res.status(200).json(sugestao);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("evento.controller.sugestao_error", error.message, {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
      itemId: idItem,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const confirmar = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const errors = validateConfirmPayload(req.body);
  if (errors.length) {
    logWarn("evento.controller.confirmar_validation", "Payload inválido.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      errors,
    });
    return res.status(400).json({ error: "Payload inválido.", details: errors });
  }

  const {
    idItem,
    evento_id,
    providencia_id,
    prazo_final,
    modelo_id,
    observacao,
  } = req.body;

  try {
    const result = await confirmarAnaliseEventoProvidencia({
      itemId: idItem,
      eventoId: evento_id,
      providenciaId: providencia_id,
      prazoFinal: prazo_final,
      modeloId: modelo_id,
      observacao,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("evento.controller.confirmar_error", error.message, {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
      itemId: idItem,
    });
    return res.status(status).json({ error: error.message });
  }
};
