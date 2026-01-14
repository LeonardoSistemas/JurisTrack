import { jest } from "@jest/globals";

const logInfoMock = jest.fn();
const logErrorMock = jest.fn();
const logWarnMock = jest.fn();

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  __esModule: true,
  logInfo: logInfoMock,
  logError: logErrorMock,
  logWarn: logWarnMock,
}));

const gerarEmbeddingMock = jest.fn(async (texto) => [
  0.1,
  0.2,
  (texto || "").length,
]);

jest.unstable_mockModule("../../src/services/embeddingService.js", () => ({
  __esModule: true,
  gerarEmbedding: gerarEmbeddingMock,
}));

const queryMock = jest.fn();

jest.unstable_mockModule("../../src/config/postgresClient.js", () => ({
  __esModule: true,
  default: { query: queryMock },
}));

let PublicacaoDuplicidadeService;

beforeAll(async () => {
  ({ PublicacaoDuplicidadeService } = await import(
    "../../src/services/publicacaoDuplicidadeService.js"
  ));
});

beforeEach(() => {
  jest.clearAllMocks();
  queryMock.mockResolvedValue({ rowCount: 0, rows: [] });
});

describe("PublicacaoDuplicidadeService.verificarEmLote", () => {
  it("retorna métricas de batch e registra logs estruturados", async () => {
    const itens = [
      {
        tenant_id: "tenant-1",
        numero_processo: "1",
        data_publicacao: "2024-01-01",
        texto: "a",
      },
      {
        tenant_id: "tenant-1",
        numero_processo: "2",
        data_publicacao: "2024-01-02",
        texto: "b",
      },
      {
        tenant_id: "tenant-1",
        numero_processo: "3",
        data_publicacao: "2024-01-03",
        texto: "c",
      },
    ];

    const { results, metrics } =
      await PublicacaoDuplicidadeService.verificarEmLote({
        itens,
        tenantId: "tenant-1",
        batchSize: 2,
        maxConcurrency: 1,
        processingTimeoutMs: 5_000,
      });

    expect(results).toHaveLength(3);
    expect(metrics.batchesCount).toBe(2);
    expect(metrics.batchDurationMsAvg).toBeGreaterThanOrEqual(0);
    expect(metrics.batchDurationMsP95).toBeGreaterThanOrEqual(0);
    expect(logInfoMock).toHaveBeenCalledWith(
      "publicacao.lote.start",
      expect.any(String),
      expect.objectContaining({
        tenantId: "tenant-1",
        batchSize: 2,
        maxConcurrency: 1,
        totalItems: 3,
      })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      "publicacao.lote.completed",
      expect.any(String),
      expect.objectContaining({
        tenantId: "tenant-1",
        batchesCount: 2,
        itemsProcessed: 3,
      })
    );
  });

  it("interrompe o processamento quando ultrapassa timeout configurado", async () => {
    const itens = [
      {
        tenant_id: "tenant-1",
        numero_processo: "1",
        data_publicacao: "2024-01-01",
        texto: "a",
      },
      {
        tenant_id: "tenant-1",
        numero_processo: "2",
        data_publicacao: "2024-01-02",
        texto: "b",
      },
    ];

    await expect(
      PublicacaoDuplicidadeService.verificarEmLote({
        itens,
        tenantId: "tenant-1",
        batchSize: 1,
        maxConcurrency: 1,
        processingTimeoutMs: 0,
        retryAfterSeconds: 15,
      })
    ).rejects.toThrow("Tempo de processamento excedido");

    expect(logWarnMock).toHaveBeenCalledWith(
      "publicacao.lote.timeout_warning",
      expect.any(String),
      expect.objectContaining({
        tenantId: "tenant-1",
        retryAfterSeconds: 15,
      })
    );
  });
});


