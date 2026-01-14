import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from "@jest/globals";

const mockConnect = jest.fn();
const mockPoolQuery = jest.fn();
const mockAddBusinessDays = jest.fn();

const logInfoMock = jest.fn();
const logWarnMock = jest.fn();
const logErrorMock = jest.fn();

jest.unstable_mockModule("../../src/config/postgresClient.js", () => ({
  __esModule: true,
  default: { connect: mockConnect, query: mockPoolQuery },
}));

jest.unstable_mockModule("../../src/utils/dateUtils.js", () => ({
  __esModule: true,
  addBusinessDays: mockAddBusinessDays,
}));

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  __esModule: true,
  logInfo: logInfoMock,
  logWarn: logWarnMock,
  logError: logErrorMock,
}));

let cadastrarItem;
let cancelarItem;
let listarPendentesPorUpload;

function buildClient({ item, failPrazo = false, processExists = false }) {
  const calls = [];
  const client = {
    query: jest.fn(async (sql, params) => {
      const normalizedSql = typeof sql === "string" ? sql : String(sql);
      calls.push({ sql: normalizedSql, params });

      if (
        normalizedSql === "BEGIN" ||
        normalizedSql === "COMMIT" ||
        normalizedSql === "ROLLBACK"
      ) {
        return { rows: [], rowCount: 0 };
      }

      if (normalizedSql.includes("from similaridade_itens")) {
        return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
      }

      if (normalizedSql.includes("from processos")) {
        if (processExists) {
          return { rows: [{ idprocesso: "proc-1" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }

      if (normalizedSql.includes("insert into processos")) {
        return { rows: [{ idprocesso: "proc-1" }], rowCount: 1 };
      }

      if (normalizedSql.includes('insert into "Publicacao"')) {
        return { rows: [{ id: "pub-1" }], rowCount: 1 };
      }

      if (normalizedSql.includes('insert into "Andamento"')) {
        return { rows: [], rowCount: 1 };
      }

      if (normalizedSql.includes('insert into "Prazo"')) {
        if (failPrazo) {
          const err = new Error("Falha ao inserir prazo");
          err.code = "PRAZO_ERROR";
          throw err;
        }
        return { rows: [], rowCount: 1 };
      }

      if (normalizedSql.includes("similaridade_descartes_auditoria")) {
        return { rows: [], rowCount: 1 };
      }

      if (normalizedSql.includes("update similaridade_itens")) {
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }),
    release: jest.fn(),
  };

  return { client, calls };
}

beforeAll(async () => {
  ({
    cadastrarItem,
    cancelarItem,
    listarPendentesPorUpload,
  } = await import("../../src/services/conciliacaoService.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  mockConnect.mockReset();
  mockPoolQuery.mockReset();
  mockAddBusinessDays.mockReset();
  mockAddBusinessDays.mockResolvedValue({ format: () => "2024-02-20" });
});

describe("conciliacaoService - integridade e auditoria", () => {
  it("faz rollback se falhar ao inserir prazo e não marca item como cadastrado", async () => {
    const item = {
      id: "item-1",
      tenant_id: "tenant-1",
      numero_processo: "0001",
      status_decisao: "pendente",
      data_publicacao: "2024-02-10",
      prazo_dias: 5,
      texto_publicacao: "Teste",
    };
    const { client, calls } = buildClient({
      item,
      failPrazo: true,
      processExists: false,
    });
    mockConnect.mockResolvedValue(client);

    await expect(
      cadastrarItem({ itemId: "item-1", tenantId: "tenant-1", userId: "u-1" })
    ).rejects.toThrow("Falha ao inserir prazo");

    const statements = calls.map((c) => c.sql);
    expect(statements).toContain("BEGIN");
    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
    expect(
      statements.some((sql) => sql.includes("status_decisao = 'cadastrado'"))
    ).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it("registra auditoria ao cancelar e atualiza status para cancelado", async () => {
    const item = {
      id: "item-2",
      tenant_id: "tenant-1",
      status_decisao: "pendente",
      numero_processo: "0002",
    };
    const { client, calls } = buildClient({ item });
    mockConnect.mockResolvedValue(client);

    const response = await cancelarItem({
      itemId: "item-2",
      tenantId: "tenant-1",
      userId: "user-7",
      motivo: "Duplicado",
    });

    expect(response).toEqual({ message: "Item cancelado e auditado com sucesso" });

    const auditCall = calls.find((c) =>
      c.sql.includes("similaridade_descartes_auditoria")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall.params).toEqual([
      "item-2",
      "tenant-1",
      expect.objectContaining(item),
      "Duplicado",
    ]);

    const updateCall = calls.find((c) =>
      c.sql.includes("status_decisao = 'cancelado'")
    );
    expect(updateCall).toBeDefined();

    expect(calls.map((c) => c.sql)).toContain("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  it("impede conciliação de item que não pertence ao tenant", async () => {
    const { client, calls } = buildClient({ item: null });
    mockConnect.mockResolvedValue(client);

    await expect(
      cadastrarItem({ itemId: "item-x", tenantId: "tenant-x" })
    ).rejects.toThrow("Item não encontrado para o tenant.");

    expect(calls.map((c) => c.sql)).toContain("ROLLBACK");
    expect(calls.some((c) => c.sql === "COMMIT")).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it("lista apenas itens pendentes do tenant informado", async () => {
    mockPoolQuery.mockResolvedValue({ rows: [{ id: "it-1" }] });

    const itens = await listarPendentesPorUpload({
      uploadId: "upload-99",
      tenantId: "tenant-ctx",
    });

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining("status_decisao = 'pendente'"),
      ["upload-99", "tenant-ctx"]
    );
    expect(itens).toEqual([{ id: "it-1" }]);
  });
});
