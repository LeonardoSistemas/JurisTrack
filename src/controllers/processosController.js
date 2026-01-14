import * as processosService from "../services/processosService.js";
import supabase from "../config/supabase.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";

export const listarProcessos = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const lista = await processosService.listarProcessos(
      req.query,
      req.tenantId
    );
    res.status(200).json(lista);
  } catch (error) {
    logError("processos.controller.list_error", "Erro ao listar processos", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      query: req.query,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const obterProcesso = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const processo = await processosService.obterProcessoCompleto(
      req.params.id,
      req.tenantId
    );
    res.status(200).json(processo);
  } catch (error) {
    logError("processos.controller.fetch_error", "Erro ao buscar processo", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      processoId: req.params?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const criarProcesso = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const novo = await processosService.criarProcesso(req.body, req.tenantId);
    res.status(201).json(novo);
  } catch (error) {
    logError("processos.controller.create_error", "Erro ao criar processo", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const atualizarProcesso = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const atualizado = await processosService.atualizarProcesso(
      req.params.id,
      req.body,
      req.tenantId
    );
    res.status(200).json(atualizado);
  } catch (error) {
    logError("processos.controller.update_error", "Erro ao atualizar processo", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      processoId: req.params?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const excluirProcesso = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    await processosService.excluirProcesso(req.params.id, req.tenantId);
    res.status(204).send();
  } catch (error) {
    logError("processos.controller.delete_error", "Erro ao excluir processo", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      processoId: req.params?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

/// --- FUNÇÃO DE ANDAMENTO MANUAL ---
export const criarAndamentoManual = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { processoId, data_evento, descricao, responsavelId } = req.body;

    // Validação básica
    if (!processoId || !descricao) {
      logWarn("processos.controller.invalid_andamento", "Processo e descrição são obrigatórios.", {
        tenantId: req.tenantId,
        userId: req.user?.id,
        processoId,
      });
      return res.status(400).json({ error: "Processo e Descrição são obrigatórios." });
    }

    // Montagem do Payload (Exatamente como no Schema)
    const payload = {
      "processoId": processoId,      // <--- Igual ao banco "processoId"
      "responsavelId": responsavelId,// <--- Igual ao banco "responsavelId"
      "data_evento": data_evento,
      "descricao": descricao,
      "tenant_id": req.tenantId      // <--- OBRIGATÓRIO (NOT NULL no schema)
    };

    // Insere na tabela "Andamento"
    const { data, error } = await supabase
      .from("Andamento")
      .insert([payload])
      .select();

    if (error) throw error;
    res.status(201).json(data);

  } catch (error) {
    logError("processos.controller.create_andamento_error", "Erro ao criar andamento", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      processoId: req.body?.processoId,
      error,
    });

    res.status(500).json({
      error: "Erro ao salvar andamento.",
      details: error.message
    });
  }
};

export const obterContextoModelo = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { id } = req.params; // Pega o ID da URL

    // Chama o serviço que criamos acima
    const contexto = await processosService.obterContextoParaModelo(
      id,
      req.tenantId
    );

    if (!contexto) {
      return res.status(404).json({ error: "Processo não encontrado para gerar contexto." });
    }

    res.status(200).json(contexto);
  } catch (error) {
    logError("processos.controller.contexto_error", "Erro ao obter contexto Modelo", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      processoId: req.params?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const criarPrazo = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { processoId, descricao, data_limite, responsavelId } = req.body;

    // Validação básica
    if (!processoId || !descricao || !data_limite) {
      return res.status(400).json({ error: "Processo, Descrição e Data de Vencimento são obrigatórios." });
    }

    let descricaoFinal = descricao;

    const novoPrazo = await processosService.criarPrazoManual({
      processoId,
      descricao: descricaoFinal,
      data_limite,
      responsavelId
    }, req.tenantId);

    res.status(201).json(novoPrazo);

  } catch (error) {
    logError("processos.controller.create_prazo_error", "Erro ao criar prazo manual", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      processoId: req.body?.processoId,
      error,
    });
    // RETORNANDO ERRO COMPLETO PARA DEBUG
    res.status(500).json({ error: "Erro ao criar prazo: " + (error.message || JSON.stringify(error)) });
  }
};