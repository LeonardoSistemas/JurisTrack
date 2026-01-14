import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const verificarEmLoteMock = jest.fn();

jest.unstable_mockModule(
  "../../src/services/publicacaoDuplicidadeService.js",
  () => ({
    __esModule: true,
    PublicacaoDuplicidadeService: {
      verificarEmLote: verificarEmLoteMock,
    },
  })
);

let router;

beforeAll(async () => {
  ({ default: router } = await import("../../src/routes/publicacoesRoutes.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.tenantId = "tenant-ctx";
    next();
  });
  app.use("/api/publicacoes", router);
  return app;
}

describe("Contrato POST /api/publicacoes/similaridade", () => {
  it("retorna 200 com headers de métricas e mantém schema esperado", async () => {
    verificarEmLoteMock.mockResolvedValue({
      results: [
        {
          status: "NOVO",
          similarity: 0,
          numero_processo: "1",
          data_publicacao: "2024-01-01",
          texto: "abc",
        },
      ],
      metrics: {
        processingTimeMs: 42,
        itemsProcessed: 1,
        batchesCount: 1,
      },
    });

    const res = await request(buildApp())
      .post("/api/publicacoes/similaridade")
      .send([
        {
          numero_processo: "1",
          data_publicacao: "2024-01-01",
          texto: "abc",
        },
      ]);

    expect(res.status).toBe(200);
    expect(res.headers["x-processing-time"]).toBe("42");
    expect(res.headers["x-items-processed"]).toBe("1");
    expect(res.headers["x-batches"]).toBe("1");
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        status: "NOVO",
        numero_processo: "1",
        data_publicacao: "2024-01-01",
        texto: "abc",
        similarity: 0,
      })
    );
    expect(verificarEmLoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-ctx",
        itens: expect.any(Array),
      })
    );
  });

  it("retorna 400 para payload inválido", async () => {
    const res = await request(buildApp())
      .post("/api/publicacoes/similaridade")
      .send({ foo: "bar" });

    expect(res.status).toBe(400);
  });

  it("retorna 503 e Retry-After quando service sinaliza sobrecarga", async () => {
    const overloadError = new Error("Tempo de processamento excedido");
    overloadError.code = "PROCESSING_TIMEOUT";
    overloadError.retryAfterSeconds = 120;
    verificarEmLoteMock.mockRejectedValue(overloadError);

    const res = await request(buildApp())
      .post("/api/publicacoes/similaridade")
      .send([
        {
          numero_processo: "1",
          data_publicacao: "2024-01-01",
          texto: "abc",
        },
      ]);

    expect(res.status).toBe(503);
    expect(res.body.retryAfterSeconds).toBe(120);
    expect(res.headers["retry-after"]).toBe("120");
  });
});


