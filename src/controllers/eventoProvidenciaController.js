import {
  confirmarAnaliseEventoProvidencia,
  getSugestaoEventoProvidencia,
} from "../services/eventoProvidenciaService.js";
import { confirmarAnaliseSimilaridade } from "../services/conciliacaoService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveConfirmMode(payload) {
  if (!payload || typeof payload !== "object") return "evento";
  const hasSimilaridadeFields =
    isNonEmptyString(payload.item_similaridade_id) ||
    isNonEmptyString(payload.publicacao_id);
  return hasSimilaridadeFields ? "similaridade" : "evento";
}

function normalizeUpstreamError(error, fallbackMessage) {
  const rawMessage = typeof error?.message === "string" ? error.message : "";
  const rawStatus = error?.statusCode || error?.status;
  const looksHtml = /<html/i.test(rawMessage);
  const isBadGateway =
    rawStatus === 502 || /502\s+Bad\s+Gateway/i.test(rawMessage) || /cloudflare/i.test(rawMessage);

  if (looksHtml || isBadGateway) {
    return {
      status: 503,
      clientMessage: "Serviço de dados temporariamente indisponível. Tente novamente.",
      logMessage: "Falha ao obter sugestão: serviço indisponível.",
      upstreamMessage: rawMessage || null,
    };
  }

  const safeMessage = rawMessage || fallbackMessage;
  return {
    status: rawStatus || 500,
    clientMessage: safeMessage,
    logMessage: safeMessage,
    upstreamMessage: null,
  };
}

function validateConfirmPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["Payload inválido."];
  }

  const mode = resolveConfirmMode(payload);

  if (mode === "similaridade") {
    const { item_similaridade_id, publicacao_id, prazo_final, decisao_final_json } =
      payload;

    if (!isNonEmptyString(item_similaridade_id)) {
      errors.push("item_similaridade_id é obrigatório.");
    }

    if (!isNonEmptyString(publicacao_id)) {
      errors.push("publicacao_id é obrigatório.");
    }

    if (prazo_final == null) {
      errors.push("prazo_final é obrigatório.");
    } else if (typeof prazo_final !== "string" && typeof prazo_final !== "object") {
      errors.push("prazo_final deve ser string ou objeto.");
    }

    if (decisao_final_json == null) {
      errors.push("decisao_final_json é obrigatório.");
    } else if (
      typeof decisao_final_json !== "string" &&
      typeof decisao_final_json !== "object"
    ) {
      errors.push("decisao_final_json deve ser string ou objeto.");
    }

    return errors;
  }

  const {
    idItem,
    evento_id,
    providencia_id,
    prazo_final,
    modelo_id,
    observacao,
    responsavel_id,
  } = payload;

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

  if (responsavel_id != null && !isNonEmptyString(responsavel_id)) {
    errors.push("responsavel_id deve ser string.");
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
    const normalized = normalizeUpstreamError(
      error,
      "Erro interno ao buscar sugestão."
    );
    const logErrorInstance =
      error instanceof Error ? error : new Error(normalized.logMessage);
    logError("evento.controller.sugestao_error", normalized.logMessage, {
      error: logErrorInstance,
      upstreamMessage: normalized.upstreamMessage,
      tenantId: req.tenantId,
      userId: req.user?.id,
      itemId: idItem,
    });
    return res.status(normalized.status).json({ error: normalized.clientMessage });
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
    responsavel_id: responsavelId,
    item_similaridade_id,
    publicacao_id,
    decisao_final_json,
  } = req.body;

  try {
    const mode = resolveConfirmMode(req.body);
    const result =
      mode === "similaridade"
        ? await confirmarAnaliseSimilaridade({
            itemSimilaridadeId: item_similaridade_id,
            publicacaoId: publicacao_id,
            prazoFinal: prazo_final,
            decisaoFinalJson: decisao_final_json,
            tenantId: req.tenantId,
            userId: req.user?.id,
          })
        : await confirmarAnaliseEventoProvidencia({
            itemId: idItem,
            eventoId: evento_id,
            providenciaId: providencia_id,
            prazoFinal: prazo_final,
            modeloId: modelo_id,
            observacao,
            responsavelId,
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
      itemId: idItem || item_similaridade_id,
    });
    return res.status(status).json({ error: error.message });
  }
};
