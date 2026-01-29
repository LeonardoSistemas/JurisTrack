import {
  cadastrarItem,
  cancelarItem,
  buscarPublicacaoVinculada,
  listarPendentesPorUpload,
} from "../services/conciliacaoService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError } from "../utils/logger.js";

function parseItemId(req) {
  return req.body?.itemId || req.params?.itemId;
}

export const cadastrar = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const itemId = parseItemId(req);
    if (!itemId) {
      return res.status(400).json({ error: "itemId é obrigatório" });
    }

    const result = await cadastrarItem({
      itemId,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("conciliacao.controller.cadastrar_error", error.message, {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const cancelar = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const itemId = parseItemId(req);
    const { motivo } = req.body || {};

    if (!itemId) {
      return res.status(400).json({ error: "itemId é obrigatório" });
    }

    const result = await cancelarItem({
      itemId,
      tenantId: req.tenantId,
      userId: req.user?.id,
      motivo,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("conciliacao.controller.cancelar_error", error.message, {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(status).json({ error: error.message });
  }
};

export const listarPendentes = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const { uploadId } = req.params || {};
    if (!uploadId) {
      return res.status(400).json({ error: "uploadId é obrigatório" });
    }

    const itens = await listarPendentesPorUpload({
      uploadId,
      tenantId: req.tenantId,
    });

    return res.status(200).json(itens);
  } catch (error) {
    logError("conciliacao.controller.listar_error", error.message, {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: error.message });
  }
};

export const obterPublicacaoVinculada = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  try {
    const { itemId } = req.params || {};
    if (!itemId) {
      return res.status(400).json({ error: "itemId é obrigatório" });
    }

    const result = await buscarPublicacaoVinculada({
      itemId,
      tenantId: req.tenantId,
    });

    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    logError("conciliacao.controller.publicacao_error", error.message, {
      error,
      tenantId: req.tenantId,
      userId: req.user?.id,
      itemId: req.params?.itemId,
    });
    return res.status(status).json({ error: error.message });
  }
};
