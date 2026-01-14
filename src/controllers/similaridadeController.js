import { PublicacaoDuplicidadeService } from "../services/publicacaoDuplicidadeService.js";
import { logError, logInfo, logWarn } from "../utils/logger.js";
import { saveSimilaridadeResultado } from "../services/similaridadeResultadoService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";

function normalizeItem(raw) {
  let item = raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const cleaned = trimmed.startsWith("Object:") ? trimmed.replace(/^Object:\s*/, "") : trimmed;
    try {
      item = JSON.parse(cleaned);
    } catch (err) {
      throw new Error(`Item inválido: não foi possível parsear string (${err.message})`);
    }
  }

  if (!item || typeof item !== "object") {
    throw new Error("Item inválido: não é objeto");
  }

  // Normaliza campos comuns
  const numero_processo = item.numero_processo ?? item.numero_do_processo ?? item.numeroProcesso;
  const data_publicacao = item.data_publicacao ?? item.dataPublicacao;
  const texto = item.texto ?? item.texto_integral ?? item.text;

  return {
    ...item,
    numero_processo,
    data_publicacao,
    texto,
  };
}

function sanitizeItens(itens) {
  return itens.map((raw, index) => {
    try {
      const item = normalizeItem(raw);
      if (!item.data_publicacao || !item.texto) {
        throw new Error(
          `Item ${index} incompleto: data_publicacao e texto são obrigatórios`
        );
      }
      return item;
    } catch (err) {
      err.message = `Falha ao sanitizar item ${index}: ${err.message}`;
      throw err;
    }
  });
}

// Endpoint para N8N: recebe { uploadId, itens: [...] } e processa similaridade
export const similaridadeController = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;

  const tenantId = req.tenantId;
  const { uploadId, itens } = req.body || {};

  if (!uploadId || !Array.isArray(itens) || itens.length === 0) {
    logWarn("n8n.similaridade.validation", "uploadId ou itens inválidos", {
      uploadId,
      itensLength: Array.isArray(itens) ? itens.length : undefined,
      tenantId,
    });
    return res
      .status(400)
      .json({ error: "uploadId e itens (array) são obrigatórios" });
  }

  try {
    const itensSanitizados = sanitizeItens(itens);

    const { results, metrics } = await PublicacaoDuplicidadeService.verificarEmLote({
      itens: itensSanitizados,
      tenantId,
    });

    await saveSimilaridadeResultado({
      uploadId,
      tenantId,
      resultadoJson: {
        results,
        metrics,
      },
      itens: itensSanitizados,
    });

    logInfo("n8n.similaridade.success", "Similaridade processada e salva", {
      uploadId,
      tenantId,
      items: results?.length,
      ...metrics,
    });

    return res.status(200).json({
      message: "Similaridade processada e salva",
      metrics,
    });
  } catch (error) {
    if (error.message?.startsWith("Falha ao sanitizar")) {
      logWarn("n8n.similaridade.sanitize_error", error.message, {
        tenantId,
        uploadId,
      });
      return res.status(400).json({ error: error.message });
    }

    logError("n8n.similaridade.error", "Erro ao processar similaridade via N8N", {
      error,
      uploadId,
      tenantId,
    });
    return res.status(500).json({ error: "Erro ao processar similaridade" });
  }
};

