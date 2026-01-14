import path from "path";
import moment from "moment-timezone";

import { logError, logInfo, logWarn } from "./logger.js";

// URL Webhook N8N (configurável via ambiente)
const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://agendamentoai-n8n.mapkkt.easypanel.host/webhook/processar_tenant/";
// Ex. local: http://localhost:5678/webhook/processar


/**
 * Gera um nome de arquivo seguro, normalizado, minúsculo e hifenizado.
 * @param {string} originalname - O nome original do arquivo (req.file.originalname).
 * @returns {string} - O nome de arquivo seguro com extensão (ex: 'meu-arquivo.pdf').
 */
export function generateSafeFilename(originalname) {
  const fileExtension = path.extname(originalname);
  const baseName = path.basename(originalname, fileExtension);

  // 1. Normaliza (remove acentos)
  const normalizedBaseName = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 2. Substitui caracteres não alfanuméricos e espaços por hífens
  const safeBaseName = normalizedBaseName
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove caracteres especiais
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-"); // Substitui espaços por hífens

  // 3. Retorna o nome final
  return `${safeBaseName}${fileExtension}`;
}

/**
 * Retorna o timestamp atual no fuso de São Paulo.
 * @returns {string} - Data formatada (ex: "YYYY-MM-DD HH:mm:ss").
 */
export function getCurrentSaoPauloTimestamp() {
  const timeZone = "America/Sao_Paulo";
  const nowSaoPaulo = moment().tz(timeZone);
  return nowSaoPaulo.format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Aciona o webhook do N8N de forma assíncrona para notificar o novo upload.
 * Não bloqueia a resposta ao usuário.
 * @param {string|number} uploadId - O ID do registro inserido no banco.
 * @param {string} tenantId - Tenant do contexto (incluir na payload).
 */
export async function notifyN8NWebhook(uploadId, tenantId) {
  if (!tenantId) {
    logError(
      "n8n.webhook.missing_tenant",
      "Falha ao acionar webhook: tenantId ausente no payload.",
      { uploadId }
    );
    return;
  }

  if (!N8N_WEBHOOK_URL) {
    logError(
      "n8n.webhook.missing_url",
      "Falha ao acionar webhook: N8N_WEBHOOK_URL ausente",
      { uploadId, tenantId }
    );
    return;
  }

  logInfo("n8n.webhook.dispatch", "Acionando webhook do n8n", {
    uploadId,
    tenantId,
    webhookUrl: N8N_WEBHOOK_URL,
  });
  try {
    // Nota: chamada permanece assíncrona em background
    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: uploadId, tenant_id: tenantId }),
    });

    if (webhookResponse.ok) {
      logInfo("n8n.webhook.success", "Webhook do n8n acionado com sucesso", {
        uploadId,
        tenantId,
      });
    } else {
      logWarn(
        "n8n.webhook.failure",
        "Falha ao acionar Webhook do n8n",
        {
          uploadId,
          tenantId,
          status: webhookResponse.status,
        }
      );
    }
  } catch (webhookError) {
    logError(
      "n8n.webhook.network_error",
      "Erro de rede ao acionar o Webhook do n8n",
      { uploadId, tenantId, error: webhookError }
    );
  }
}