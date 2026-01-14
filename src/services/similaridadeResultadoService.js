import supabase from "../config/supabase.js";
import { withTenantFilter, injectTenant } from "../repositories/tenantScope.js";
import { addBusinessDays } from "../utils/dateUtils.js";
import { logError, logWarn } from "../utils/logger.js";
import moment from "moment-timezone";

function resolveDataPublicacao(item = {}) {
  const value =
    item.data_publicacao ??
    item.dataPublicacao ??
    item.nova_movimentacao ??
    item.novaMovimentacao ??
    null;

  if (!value) return null;

  // Aceita Date, ISO ou dd/MM/yyyy; sempre normaliza para YYYY-MM-DD.
  if (value instanceof Date) return value.toISOString().split("T")[0];

  if (typeof value === "string") {
    const parsed = moment.tz(value, ["YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY"], true, "America/Sao_Paulo");
    if (!parsed.isValid()) {
      logWarn("similaridade.save.invalid_date", "Data de publicação inválida", {
        rawValue: value,
      });
      return null;
    }
    return parsed.format("YYYY-MM-DD");
  }

  return null;
}

function resolveTexto(item = {}, fallbackTexto) {
  return (
    item.texto ??
    item.texto_integral ??
    item.textoIntegral ??
    item.text ??
    fallbackTexto ??
    null
  );
}

function resolveNumeroProcesso(item = {}, fallbackNumero) {
  return (
    item.numero_processo ??
    item.numeroProcesso ??
    item.processNumber ??
    fallbackNumero ??
    null
  );
}

function resolvePrazoDias(item = {}) {
  const prazo =
    item.prazo_dias ??
    item.prazoDias ??
    item.prazo ??
    item.prazo_de_entrega ??
    item.prazoDeEntrega ??
    null;

  const parsed = Number(prazo);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeEmbeddingValue(raw) {
  if (!raw) return null;

  if (Array.isArray(raw)) {
    const nums = raw.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    return nums.length ? nums : null;
  }

  if (ArrayBuffer.isView(raw)) {
    const nums = Array.from(raw).map((v) => Number(v)).filter((v) => Number.isFinite(v));
    return nums.length ? nums : null;
  }

  if (typeof raw === "object") {
    if (Array.isArray(raw?.values)) {
      return normalizeEmbeddingValue(raw.values);
    }
    if (Array.isArray(raw?.data)) {
      return normalizeEmbeddingValue(raw.data);
    }
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeEmbeddingValue(parsed);
      } catch {
        return null;
      }
    }
  }

  return null;
}

function resolveEmbedding(resultado, original) {
  return (
    normalizeEmbeddingValue(resultado?.embedding) ??
    normalizeEmbeddingValue(original?.embedding) ??
    null
  );
}

async function calcularDataVencimento(dataPublicacao, prazoDias) {
  if (!dataPublicacao || !prazoDias) {
    return null;
  }

  try {
    const dataCalculada = await addBusinessDays(dataPublicacao, prazoDias);
    return dataCalculada?.format("YYYY-MM-DD") ?? null;
  } catch (error) {
    logWarn(
      "similaridade.save.data_vencimento_error",
      "Falha ao calcular data_vencimento",
      {
        dataPublicacao,
        prazoDias,
        message: error?.message,
      }
    );
    return null;
  }
}

// Salva ou atualiza o resultado de similaridade vinculado a um upload
export async function saveSimilaridadeResultado({
  uploadId,
  tenantId,
  resultadoJson,
  itens,
}) {
  if (!uploadId || !tenantId) {
    throw new Error("uploadId e tenantId são obrigatórios");
  }

  const results = resultadoJson?.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("resultadoJson.results deve ser um array com itens processados");
  }

  const itensOriginais = Array.isArray(itens) ? itens : [];
  if (itensOriginais.length && itensOriginais.length !== results.length) {
    logWarn(
      "similaridade.save.length_mismatch",
      "Quantidade de itens original difere do resultado calculado",
      {
        uploadId,
        tenantId,
        itensOriginais: itensOriginais.length,
        resultados: results.length,
      }
    );
  }

  try {
    // Verifica se o upload pertence ao tenant
    const { data: uploadDoc, error: fetchError } = await withTenantFilter(
      "upload_Documentos",
      tenantId
    )
      .select("id")
      .eq("id", uploadId)
      .maybeSingle();

    if (fetchError || !uploadDoc) {
      const msg = "Upload não encontrado ou não pertence ao tenant.";
      logWarn("similaridade.save.upload_not_found", msg, {
        uploadId,
        tenantId,
        error: fetchError,
      });
      throw new Error(msg);
    }

    const now = new Date().toISOString();

    // Garante idempotência ao reprocessar o mesmo upload
    const { error: cleanupError } = await withTenantFilter(
      "similaridade_itens",
      tenantId
    )
      .delete()
      .eq("upload_documento_id", uploadId);

    if (cleanupError) {
      throw cleanupError;
    }

    const itensParaInserir = await Promise.all(
      results.map(async (resultado, index) => {
        const original = itensOriginais[index] ?? {};
        const dataPublicacao = resolveDataPublicacao(original);
        const prazoDias = resolvePrazoDias(original);
        const dataVencimento = await calcularDataVencimento(
          dataPublicacao,
          prazoDias
        );
        const embedding = resolveEmbedding(resultado, original);

        return injectTenant(
          {
            upload_documento_id: uploadId,
            status_verificacao: resultado?.status ?? null,
            status_decisao: "pendente",
            similaridade_score: resultado?.similarity ?? null,
            numero_processo: resolveNumeroProcesso(
              original,
              resultado?.numero_processo
            ),
            texto_publicacao: resolveTexto(original, resultado?.texto),
            data_publicacao: dataPublicacao,
            prazo_dias: prazoDias,
            data_vencimento: dataVencimento,
            hash_publicacao: resultado?.hash ?? null,
            embedding,
            dados_originais: Object.keys(original || {}).length ? original : null,
            created_at: now,
            updated_at: now,
          },
          tenantId
        );
      })
    );

    const { error: insertError } = await supabase
      .from("similaridade_itens")
      .insert(itensParaInserir, { returning: "minimal" });

    if (insertError) {
      throw insertError;
    }

    // Mantém o registro agregado para compatibilidade / auditoria
    const resultadoPayload = {
      upload_documento_id: uploadId,
      resultado_json: resultadoJson,
      updated_at: now,
    };

    const { error: upsertError } = await supabase
      .from("similaridade_resultados")
      .upsert([injectTenant(resultadoPayload, tenantId)], {
        onConflict: "upload_documento_id,tenant_id",
        returning: "minimal",
      });

    if (upsertError) {
      throw upsertError;
    }

    // Atualiza status do upload para processado somente após persistir tudo
    const { error: updateError } = await withTenantFilter(
      "upload_Documentos",
      tenantId
    )
      .update({ status: "processado" })
      .eq("id", uploadId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    logError("similaridade.save.error", "Erro ao salvar resultado de similaridade", {
      error,
      uploadId,
      tenantId,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    throw error;
  }
}
