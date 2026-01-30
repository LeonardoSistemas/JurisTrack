import * as modelosPeticaoService from "../services/modelosPeticaoService.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";

// Função auxiliar para tratar tags (String "a,b" -> Array ["a","b"])
const processTags = (tags) => {
  if (tags && typeof tags === "string") {
    return tags.split(",").map((tag) => tag.trim());
  }
  if (Array.isArray(tags)) {
    return tags;
  }
  return [];
};

export const create = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  const { titulo, descricao, tags, conteudo } = req.body;

  // Validação
  if (!titulo || !conteudo) {
    logWarn("modelosPeticao.controller.validation", "Título e Conteúdo são obrigatórios.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
    return res.status(400).json({ error: "Título e Conteúdo são obrigatórios." });
  }

  try {
    const tagsArray = processTags(tags);
    
    const novoModelo = await modelosPeticaoService.createModeloPeticao(
      {
        titulo,
        descricao,
        conteudo,
        tags: tagsArray.length > 0 ? tagsArray : null,
      },
      req.tenantId
    );

    res.status(201).json(novoModelo);
  } catch (error) {
    logError("modelosPeticao.controller.create_error", "Erro ao criar modelo de petição", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const getAll = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const searchTerm = typeof req.query.q === "string" ? req.query.q : "";
    const modelos = await modelosPeticaoService.listModelosPeticao(
      req.tenantId,
      searchTerm
    );
    res.status(200).json(modelos);
  } catch (error) {
    logError("modelosPeticao.controller.list_error", "Erro ao listar modelos de petição", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const getById = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  const { id } = req.params;

  try {
    const modelo = await modelosPeticaoService.getModeloPeticaoById(id, req.tenantId);

    if (!modelo) {
      return res.status(404).json({ error: "Modelo de petição não encontrado." });
    }

    res.status(200).json(modelo);
  } catch (error) {
    logError("modelosPeticao.controller.fetch_error", "Erro ao buscar modelo de petição", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      modeloId: id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  const { id } = req.params;
  const { titulo, descricao, tags, conteudo } = req.body;

  if (!titulo || !conteudo) {
    logWarn("modelosPeticao.controller.validation", "Título e Conteúdo são obrigatórios.", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      modeloId: id,
    });
    return res.status(400).json({ error: "Título e Conteúdo são obrigatórios." });
  }

  try {
    const tagsArray = processTags(tags);

    const modeloAtualizado = await modelosPeticaoService.updateModeloPeticao(
      id,
      {
        titulo,
        descricao,
        conteudo,
        tags: tagsArray.length > 0 ? tagsArray : null,
      },
      req.tenantId
    );

    if (!modeloAtualizado) {
      return res.status(404).json({ error: "Modelo de petição não encontrado." });
    }

    res.status(200).json(modeloAtualizado);
  } catch (error) {
    logError("modelosPeticao.controller.update_error", "Erro ao atualizar modelo de petição", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      modeloId: id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  const { id } = req.params;

  try {
    const modeloDeletado = await modelosPeticaoService.deleteModeloPeticao(
      id,
      req.tenantId
    );

    if (!modeloDeletado) {
      return res.status(404).json({ error: "Modelo de petição não encontrado." });
    }

    res.status(200).json({ message: "Modelo de petição deletado com sucesso.", data: modeloDeletado });
  } catch (error) {
    logError("modelosPeticao.controller.delete_error", "Erro ao deletar modelo de petição", {
      tenantId: req.tenantId,
      userId: req.user?.id,
      modeloId: id,
      error,
    });
    res.status(500).json({ error: error.message });
  }
};
