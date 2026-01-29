import moment from "moment-timezone";
import { addBusinessDays } from "../utils/dateUtils.js";
import { logWarn } from "../utils/logger.js";

export const PRAZO_TIPO = {
  UTIL: "util",
  CORRIDO: "corrido",
  DATA_FIXA: "data_fixa",
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function normalizePrazoTipo(tipoPrazo) {
  if (!tipoPrazo) return null;
  const raw = String(tipoPrazo).trim().toLowerCase();
  const withoutAccents = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const compact = withoutAccents.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");

  if (Object.values(PRAZO_TIPO).includes(compact)) {
    return compact;
  }

  const aliases = {
    util: PRAZO_TIPO.UTIL,
    uteis: PRAZO_TIPO.UTIL,
    dia_util: PRAZO_TIPO.UTIL,
    dias_uteis: PRAZO_TIPO.UTIL,
    corrido: PRAZO_TIPO.CORRIDO,
    corridos: PRAZO_TIPO.CORRIDO,
    dia_corrido: PRAZO_TIPO.CORRIDO,
    dias_corridos: PRAZO_TIPO.CORRIDO,
    data_fixa: PRAZO_TIPO.DATA_FIXA,
    datafixa: PRAZO_TIPO.DATA_FIXA,
    data_fixo: PRAZO_TIPO.DATA_FIXA,
  };

  return aliases[compact] || null;
}

function normalizeDias(prazoDias) {
  const parsed = Number(prazoDias);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFixedDate(value) {
  if (!value) return null;
  const parsed = moment.tz(
    String(value),
    ["YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY"],
    true,
    DEFAULT_TIMEZONE
  );
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

export async function calculateDueDate({
  startDate,
  prazoDias,
  tipoPrazo,
  fixedDate,
}) {
  const normalizedTipo = normalizePrazoTipo(tipoPrazo);

  if (!normalizedTipo) {
    logWarn("prazo.tipo.invalid", "Tipo de prazo inválido", {
      tipoPrazo,
    });
    return null;
  }

  if (normalizedTipo === PRAZO_TIPO.DATA_FIXA) {
    const normalizedFixed = normalizeFixedDate(fixedDate ?? prazoDias);
    if (!normalizedFixed) {
      logWarn("prazo.data_fixa.invalid", "Data fixa inválida para prazo", {
        fixedDate,
        prazoDias,
      });
      return null;
    }
    return normalizedFixed;
  }

  const dias = normalizeDias(prazoDias);
  if (!startDate || !dias) {
    return null;
  }

  if (normalizedTipo === PRAZO_TIPO.UTIL) {
    const dataCalculada = await addBusinessDays(startDate, dias);
    return dataCalculada?.format("YYYY-MM-DD") ?? null;
  }

  const baseDate = moment.tz(startDate, ["YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY"], true, DEFAULT_TIMEZONE);
  if (!baseDate.isValid()) {
    return null;
  }

  return baseDate.add(dias, "days").format("YYYY-MM-DD");
}

export async function buildPrazoSuggestion({
  dataPublicacao,
  prazoDias,
  tipoPrazo,
  fixedDate,
}) {
  const normalizedTipo = normalizePrazoTipo(tipoPrazo);
  const normalizedDias = normalizeDias(prazoDias);

  if (!normalizedTipo) {
    return null;
  }

  if (normalizedTipo !== PRAZO_TIPO.DATA_FIXA && (!dataPublicacao || !normalizedDias)) {
    return null;
  }

  const dataVencimento = await calculateDueDate({
    startDate: dataPublicacao,
    prazoDias,
    tipoPrazo: normalizedTipo,
    fixedDate,
  });

  if (!dataVencimento) {
    return null;
  }

  return {
    dias: normalizedTipo === PRAZO_TIPO.DATA_FIXA ? null : normalizedDias,
    tipo: normalizedTipo,
    data_vencimento: dataVencimento,
  };
}
