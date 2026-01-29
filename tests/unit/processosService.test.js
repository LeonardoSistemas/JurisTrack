import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

const mockFrom = jest.fn();
const mockInjectTenant = jest.fn((payload, tenantId) => ({
  ...payload,
  tenant_id: tenantId,
}));
const mockWithTenantFilter = jest.fn();

jest.unstable_mockModule("../../src/config/supabase.js", () => ({
  __esModule: true,
  default: {
    from: mockFrom,
  },
}));

jest.unstable_mockModule("../../src/repositories/tenantScope.js", () => ({
  __esModule: true,
  withTenantFilter: mockWithTenantFilter,
  injectTenant: mockInjectTenant,
}));

let criarPrazoManual;
let obterProcessoCompleto;

beforeAll(async () => {
  ({ criarPrazoManual, obterProcessoCompleto } = await import(
    "../../src/services/processosService.js"
  ));
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockReset();
  mockWithTenantFilter.mockReset();
  mockInjectTenant.mockClear();
});

describe("processosService.criarPrazoManual", () => {
  it("insere prazo direto com processoid e status default", async () => {
    const auxStatusBuilder = {
      select: jest.fn(() => auxStatusBuilder),
      eq: jest.fn(() => auxStatusBuilder),
      maybeSingle: jest.fn(async () => ({
        data: { id: "status-1" },
        error: null,
      })),
    };

    const prazoInsertResult = { data: { id: "prazo-1" }, error: null };
    const insertBuilder = {
      select: jest.fn(() => ({
        single: jest.fn(async () => prazoInsertResult),
      })),
    };
    const prazoBuilder = {
      insert: jest.fn(() => insertBuilder),
    };

    mockFrom.mockImplementation((table) => {
      if (table === "aux_status") return auxStatusBuilder;
      if (table === "Prazo") return prazoBuilder;
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await criarPrazoManual(
      {
        processoId: "proc-1",
        descricao: "Prazo teste",
        data_limite: "2026-01-10",
        responsavelId: "user-1",
      },
      "tenant-1"
    );

    expect(result).toEqual({ id: "prazo-1" });
    expect(mockFrom).toHaveBeenCalledWith("aux_status");
    expect(auxStatusBuilder.select).toHaveBeenCalledWith("id");
    expect(auxStatusBuilder.eq).toHaveBeenCalledWith("nome", "pendente");
    expect(auxStatusBuilder.eq).toHaveBeenCalledWith("dominio", "prazo");

    const insertedPayload = prazoBuilder.insert.mock.calls[0][0][0];
    expect(insertedPayload).toEqual(
      expect.objectContaining({
        descricao: "Prazo teste",
        data_limite: "2026-01-10",
        processoid: "proc-1",
        status_id: "status-1",
        responsavelId: "user-1",
        tenant_id: "tenant-1",
      })
    );
  });
});

describe("processosService.obterProcessoCompleto", () => {
  it("consulta prazos direto na raiz do processo", async () => {
    const selectMock = jest.fn(() => builder);
    const eqMock = jest.fn(() => builder);
    const maybeSingleMock = jest.fn(async () => ({
      data: { idprocesso: "proc-1" },
      error: null,
    }));

    const builder = {
      select: selectMock,
      eq: eqMock,
      maybeSingle: maybeSingleMock,
    };

    mockWithTenantFilter.mockReturnValueOnce(builder);

    const result = await obterProcessoCompleto("proc-1", "tenant-1");

    expect(result).toEqual({ idprocesso: "proc-1" });
    expect(mockWithTenantFilter).toHaveBeenCalledWith("processos", "tenant-1");
    expect(selectMock).toHaveBeenCalledWith(expect.any(String));

    const selectArg = selectMock.mock.calls[0][0];
    expect(selectArg).toContain("Prazo!prazo_processoid_fkey");
    expect(selectArg).not.toContain("Prazo (");
    expect(eqMock).toHaveBeenCalledWith("idprocesso", "proc-1");
    expect(maybeSingleMock).toHaveBeenCalled();
  });
});
