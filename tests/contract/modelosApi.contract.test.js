import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";
import { signAuthToken } from "../../src/utils/tokenUtils.js";
import {
  DEFAULT_TENANT_ID,
  OTHER_TENANT_ID,
  cloneFixture,
  modelosByTenant,
} from "../fixtures/multiTenant.js";

const listModelosMock = jest.fn();
const createModeloMock = jest.fn();

jest.unstable_mockModule("../../src/services/modelosPeticaoService.js", () => ({
  __esModule: true,
  listModelosPeticao: listModelosMock,
  createModeloPeticao: createModeloMock,
  getModeloPeticaoById: jest.fn(),
  updateModeloPeticao: jest.fn(),
  deleteModeloPeticao: jest.fn(),
}));

describe("Contrato API /api/modelos-peticao com isolamento por tenant", () => {
  let app;
  let defaultToken;
  let otherToken;
  let db;

  beforeAll(async () => {
    const modelosRoute = (await import("../../src/routes/modelosPeticao.js"))
      .default;

    app = express();
    app.use(express.json());
    app.use("/api/modelos-peticao", modelosRoute);

    defaultToken = signAuthToken({
      userId: "user-1",
      tenantId: DEFAULT_TENANT_ID,
      role: "admin",
    });
    otherToken = signAuthToken({
      userId: "user-2",
      tenantId: OTHER_TENANT_ID,
      role: "admin",
    });
  });

  beforeEach(() => {
    db = cloneFixture(modelosByTenant);
    jest.clearAllMocks();

    listModelosMock.mockImplementation(async (tenantId) =>
      cloneFixture(db[tenantId] || [])
    );
    createModeloMock.mockImplementation(async (payload, tenantId) => {
      const entry = {
        ...payload,
        id: `modelo-${(db[tenantId] || []).length + 1}`,
        tenant_id: tenantId,
      };
      db[tenantId] = [...(db[tenantId] || []), entry];
      return entry;
    });
  });

  it("bloqueia acesso sem token", async () => {
    const res = await request(app).get("/api/modelos-peticao");
    expect(res.status).toBe(401);
  });

  it("lista modelos apenas do tenant do token", async () => {
    const res = await request(app)
      .get("/api/modelos-peticao")
      .set("Authorization", `Bearer ${defaultToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(db[DEFAULT_TENANT_ID].length);
    expect(res.body.map((m) => m.id)).not.toContain("modelo-2");
    expect(listModelosMock).toHaveBeenCalledWith(DEFAULT_TENANT_ID);

    const resOther = await request(app)
      .get("/api/modelos-peticao")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(resOther.status).toBe(200);
    expect(resOther.body).toHaveLength(db[OTHER_TENANT_ID].length);
    expect(listModelosMock).toHaveBeenCalledWith(OTHER_TENANT_ID);
  });

  it("ignora tenant_id da payload e usa tenant do token na criação", async () => {
    const res = await request(app)
      .post("/api/modelos-peticao")
      .set("Authorization", `Bearer ${defaultToken}`)
      .send({
        titulo: "Novo Modelo",
        descricao: "Teste",
        conteudo: "<p>conteudo</p>",
        tenant_id: OTHER_TENANT_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body.tenant_id).toBe(DEFAULT_TENANT_ID);
    expect(createModeloMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: "Novo Modelo" }),
      DEFAULT_TENANT_ID
    );
    expect(db[OTHER_TENANT_ID]).toHaveLength(modelosByTenant[OTHER_TENANT_ID].length);
  });
});
