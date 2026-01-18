import { describe, it, expect } from "@jest/globals";
import { matchAndamentoByRules } from "../../src/services/eventoProvidenciaService.js";

describe("eventoProvidenciaService - matchAndamentoByRules", () => {
  it("prioriza match exato normalizado", () => {
    const regrasExatas = [
      { id: "1", andamento_descricao: "Intimação Eletrônica" },
    ];
    const regrasContem = [
      { id: "2", andamento_descricao: "Intimação" },
    ];

    const match = matchAndamentoByRules({
      tipoAndamento: "INTIMAÇÃO eletrônica",
      regrasExatas,
      regrasContem,
    });

    expect(match).toEqual(regrasExatas[0]);
  });

  it("escolhe o match mais específico no tipo contém", () => {
    const regrasContem = [
      { id: "1", andamento_descricao: "sentença" },
      { id: "2", andamento_descricao: "sentença de mérito" },
    ];

    const match = matchAndamentoByRules({
      tipoAndamento: "Sentença de mérito publicada",
      regrasExatas: [],
      regrasContem,
    });

    expect(match).toEqual(regrasContem[1]);
  });

  it("retorna null quando não encontra match", () => {
    const match = matchAndamentoByRules({
      tipoAndamento: "Despacho interno",
      regrasExatas: [],
      regrasContem: [{ id: "1", andamento_descricao: "intimação" }],
    });

    expect(match).toBeNull();
  });
});
