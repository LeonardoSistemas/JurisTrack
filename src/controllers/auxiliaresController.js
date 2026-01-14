import * as auxiliaresService from "../services/auxiliaresService.js";
import { logError } from "../utils/logger.js";

export const listar = (tabela) => async (req, res) => {
  try {
    const lista = await auxiliaresService.listarTabela(tabela);
    res.json(lista);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const salvar = (tabela, campoId) => async (req, res) => {
  try {
    // CORREÇÃO: Injetar o tenant_id no payload
    const payload = {
      ...req.body,
      tenant_id: req.tenantId
    };

    const resultado = await auxiliaresService.salvarRegisto(tabela, campoId, payload);
    res.status(201).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const excluir = (tabela, campoId) => async (req, res) => {
  try {
    await auxiliaresService.eliminarRegisto(tabela, campoId, req.params.id);
    res.status(204).send();
  } catch (error) {
    logError("auxiliares.controller.delete_error", `Erro ao excluir em ${tabela}`, {
      path: req.path,
      method: req.method,
      tabela,
      id: req.params?.id,
      error,
    });

    // Erro 23503: Código do Postgres para violação de chave estrangeira
    if (error.code === '23503') {
      return res.status(409).json({ 
        error: "Este registro possui vínculos (processos ou outros) e não pode ser removido para preservar o histórico." 
      });
    }

    res.status(500).json({ error: "Erro ao processar a exclusão no servidor." });
  }
};