// Funções puras usadas pelo front de similaridade (sem dependência de DOM)

export const STATUS_ORDER = [
  "DUPLICADO_HASH",
  "DUPLICADO_SEMANTICO",
  "POSSIVEL_DUPLICADO",
  "NOVO",
  "ERRO_PROCESSAMENTO",
  "REQUEST_LIMITED",
  "DESCONHECIDO",
];

export const STATUS_META = {
  DUPLICADO_HASH: {
    label: "Duplicado (hash)",
    variant: "danger",
    description: "Hash idêntico encontrado",
  },
  DUPLICADO_SEMANTICO: {
    label: "Duplicado semântico",
    variant: "danger",
    description: "Texto muito semelhante",
  },
  POSSIVEL_DUPLICADO: {
    label: "Possível duplicado",
    variant: "danger",
    description: "Semelhança alta, revisar",
  },
  NOVO: {
    label: "Novo",
    variant: "primary",
    description: "Nenhuma similaridade relevante",
  },
  ERRO_PROCESSAMENTO: {
    label: "Erro ao processar",
    variant: "secondary",
    description: "Item retornou erro",
  },
  REQUEST_LIMITED: {
    label: "Limite atingido",
    variant: "secondary",
    description: "Backend sinalizou sobrecarga",
  },
  DESCONHECIDO: {
    label: "Status desconhecido",
    variant: "secondary",
    description: "Status não mapeado",
  },
};

function resolveStatus(status) {
  return status && STATUS_META[status] ? status : "DESCONHECIDO";
}

export function normalizeItem(raw = {}) {
  const numero_processo = raw.numero_processo ?? raw.numeroProcesso;
  const data_publicacao = raw.data_publicacao ?? raw.dataPublicacao;
  const texto = raw.texto ?? raw.text;

  return {
    numero_processo,
    data_publicacao,
    texto,
  };
}

export function sanitizePayload(items) {
  if (!Array.isArray(items)) {
    throw new Error("Payload deve ser um array");
  }

  return items.map((raw, index) => {
    const item = normalizeItem(raw);
    if (!item.data_publicacao || !item.texto) {
      throw new Error(
        `Item ${index} está incompleto: data_publicacao e texto são obrigatórios`
      );
    }

    const hasNumero =
      item.numero_processo !== undefined &&
      item.numero_processo !== null &&
      item.numero_processo !== '';

    return {
      numero_processo: hasNumero ? String(item.numero_processo) : null,
      data_publicacao: String(item.data_publicacao),
      texto: String(item.texto),
    };
  });
}

export function groupByStatus(results = []) {
  if (!Array.isArray(results)) {
    throw new Error("Resultados devem ser um array");
  }

  return results.reduce((acc, current) => {
    const status = resolveStatus(current?.status);
    if (!acc[status]) acc[status] = [];
    acc[status].push(current);
    return acc;
  }, {});
}

export function buildStatusCardsData(results = []) {
  const grouped = groupByStatus(results);
  const cards = Object.entries(grouped).map(([status, items]) => ({
    status,
    label: STATUS_META[status]?.label ?? status,
    variant: STATUS_META[status]?.variant ?? "secondary",
    description: STATUS_META[status]?.description ?? "",
    count: items.length,
    items,
  }));

  const orderIndex = STATUS_ORDER.reduce((acc, status, index) => {
    acc[status] = index;
    return acc;
  }, {});

  return cards.sort((a, b) => {
    const indexA = orderIndex[a.status] ?? STATUS_ORDER.length;
    const indexB = orderIndex[b.status] ?? STATUS_ORDER.length;
    return indexA - indexB;
  });
}

export function extractMetricsFromHeaders(headers) {
  if (!headers) return null;

  const processingTimeMs = Number(headers.get?.("X-Processing-Time") ?? 0);
  const itemsProcessed = Number(headers.get?.("X-Items-Processed") ?? 0);

  if (!processingTimeMs && !itemsProcessed) return null;

  return {
    processingTimeMs,
    itemsProcessed,
  };
}

export function formatSimilarity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  const normalized = numeric > 1 ? numeric : numeric * 100;
  return `${normalized.toFixed(1)}%`;
}

export function formatDateIso(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

