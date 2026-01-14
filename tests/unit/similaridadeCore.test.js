import {
  STATUS_ORDER,
  buildStatusCardsData,
  groupByStatus,
  sanitizePayload,
} from "../../public/js/similaridade-core.js";

describe("sanitizePayload", () => {
  it("normaliza chaves alternativas e aplica tenant fallback", () => {
    const payload = [
      {
        numeroProcesso: "123",
        data_publicacao: "2024-01-01",
        texto: "abc",
      },
    ];

    const result = sanitizePayload(payload, "tenant-1");

    expect(result).toEqual([
      {
        numero_processo: "123",
        data_publicacao: "2024-01-01",
        texto: "abc",
        tenant_id: "tenant-1",
      },
    ]);
  });

  it("lança erro quando campos obrigatórios faltam", () => {
    const invalid = [{ numero_processo: "1", tenant_id: "t1" }];
    expect(() => sanitizePayload(invalid)).toThrow(/incompleto/i);
  });
});

describe("groupByStatus e buildStatusCardsData", () => {
  const sample = [
    { status: "NOVO", numero_processo: "1" },
    { status: "POSSIVEL_DUPLICADO", numero_processo: "2" },
    { status: "NOVO", numero_processo: "3" },
    { status: "DUPLICADO_HASH", numero_processo: "4" },
    { status: "DESCONHECIDO", numero_processo: "5" },
    { status: "INEXISTENTE", numero_processo: "6" },
  ];

  it("agrupa resultados por status", () => {
    const grouped = groupByStatus(sample);
    expect(grouped.NOVO).toHaveLength(2);
    expect(grouped.POSSIVEL_DUPLICADO).toHaveLength(1);
    expect(grouped.DUPLICADO_HASH).toHaveLength(1);
    expect(grouped.DESCONHECIDO).toHaveLength(2); // INEXISTENTE cai em DESCONHECIDO
  });

  it("ordena cartões conforme STATUS_ORDER", () => {
    const cards = buildStatusCardsData(sample);
    const order = cards.map((c) => c.status);
    const expectedFirst = STATUS_ORDER.filter((s) => order.includes(s));
    expect(order.slice(0, expectedFirst.length)).toEqual(expectedFirst);
  });
});

