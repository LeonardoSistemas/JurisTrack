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

let modelosPeticaoService;

beforeAll(async () => {
  modelosPeticaoService = await import("../../src/services/modelosPeticaoService.js");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockReset();
  mockWithTenantFilter.mockReset();
  mockInjectTenant.mockClear();
});

describe("modelosPeticaoService", () => {
  const tenantId = "tenant-123";

  describe("createModeloPeticao", () => {
    it("deve criar um novo modelo com tenant_id", async () => {
      const dadosModelo = { titulo: "Teste", conteudo: "Conteudo" };
      const mockResult = { data: { id: "1", ...dadosModelo, tenant_id: tenantId }, error: null };
      
      const singleMock = jest.fn().mockResolvedValue(mockResult);
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      
      mockFrom.mockReturnValue({ insert: insertMock });

      const result = await modelosPeticaoService.createModeloPeticao(dadosModelo, tenantId);

      expect(result).toEqual(mockResult.data);
      expect(mockFrom).toHaveBeenCalledWith("Modelos_Peticao");
      expect(mockInjectTenant).toHaveBeenCalledWith(dadosModelo, tenantId);
    });

    it("deve lançar erro se o supabase retornar erro", async () => {
      const mockError = { data: null, error: new Error("Erro no banco") };
      const singleMock = jest.fn().mockResolvedValue(mockError);
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      mockFrom.mockReturnValue({ insert: insertMock });

      await expect(modelosPeticaoService.createModeloPeticao({}, tenantId)).rejects.toThrow("Erro no banco");
    });
  });

  describe("listModelosPeticao", () => {
    it("deve listar modelos do tenant", async () => {
      const mockData = [{ id: "1", titulo: "Modelo 1" }];
      const orderMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const builder = {
        select: jest.fn(() => builder),
        or: jest.fn(() => builder),
        order: orderMock,
      };

      mockWithTenantFilter.mockReturnValue(builder);

      const result = await modelosPeticaoService.listModelosPeticao(tenantId);

      expect(result).toEqual(mockData);
      expect(mockWithTenantFilter).toHaveBeenCalledWith("Modelos_Peticao", tenantId);
      expect(builder.select).toHaveBeenCalledWith("id, titulo, descricao, tags");
    });

    it("aplica filtro por texto quando informado", async () => {
      const mockData = [{ id: "2", titulo: "Petição Trabalhista" }];
      const orderMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const builder = {
        select: jest.fn(() => builder),
        or: jest.fn(() => builder),
        order: orderMock,
      };

      mockWithTenantFilter.mockReturnValue(builder);

      const result = await modelosPeticaoService.listModelosPeticao(
        tenantId,
        "trabalhista"
      );

      expect(result).toEqual(mockData);
      expect(builder.or).toHaveBeenCalledWith(
        "titulo.ilike.%trabalhista%,descricao.ilike.%trabalhista%"
      );
    });
  });

  describe("getModeloPeticaoById", () => {
    it("deve buscar um modelo por ID", async () => {
      const mockData = { id: "1", titulo: "Modelo 1" };
      const maybeSingleMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const eqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      
      mockWithTenantFilter.mockReturnValue({ select: selectMock });

      const result = await modelosPeticaoService.getModeloPeticaoById("1", tenantId);

      expect(result).toEqual(mockData);
      expect(eqMock).toHaveBeenCalledWith("id", "1");
    });
  });

  describe("updateModeloPeticao", () => {
    it("deve atualizar um modelo", async () => {
      const dados = { titulo: "Novo Titulo" };
      const mockData = { id: "1", ...dados };
      const maybeSingleMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const selectMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqMock = jest.fn().mockReturnValue({ select: selectMock });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      
      mockWithTenantFilter.mockReturnValue({ update: updateMock });

      const result = await modelosPeticaoService.updateModeloPeticao("1", dados, tenantId);

      expect(result).toEqual(mockData);
      expect(updateMock).toHaveBeenCalledWith(dados);
    });
  });

  describe("deleteModeloPeticao", () => {
    it("deve deletar um modelo", async () => {
      const mockData = { id: "1" };
      const maybeSingleMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const selectMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqMock = jest.fn().mockReturnValue({ select: selectMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      
      mockWithTenantFilter.mockReturnValue({ delete: deleteMock });

      const result = await modelosPeticaoService.deleteModeloPeticao("1", tenantId);

      expect(result).toEqual(mockData);
      expect(mockWithTenantFilter).toHaveBeenCalledWith("Modelos_Peticao", tenantId);
    });
  });
});
