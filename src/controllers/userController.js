import {
  createUser,
  inactivateUser,
  listUsers,
  reactivateUser,
  updateUser,
} from "../services/userService.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/authErrors.js";
import { ensureTenantAuthorization } from "../utils/authz.js";
import { logError, logWarn } from "../utils/logger.js";

function handleError(res, error, context = {}) {
  if (error instanceof ValidationError || error instanceof ConflictError) {
    logWarn("users.request.invalid", error.message, context);
    const status = error instanceof ConflictError ? 400 : error.status ?? 400;
    return res.status(status).json({ message: error.message });
  }

  if (error instanceof NotFoundError) {
    logWarn("users.request.not_found", error.message, context);
    return res.status(404).json({ message: error.message });
  }

  logError("users.request.error", "Erro interno", { ...context, error });
  return res.status(500).json({ message: "Erro interno" });
}

export const listUsersController = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { status } = req.query || {};
    const users = await listUsers({ tenantId: req.tenantId, status });
    return res.status(200).json(users);
  } catch (error) {
    return handleError(res, error, {
      tenantId: req.tenantId,
      userId: req.user?.id,
      status: req.query?.status,
    });
  }
};

export const createUserController = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const {nome, email, password, role, status } = req.body || {};
    const result = await createUser({
      nome,
      email,
      password,
      role,
      tenantId: req.tenantId,
      status,
    });
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error, {
      nome: req.body?.nome,
      email: req.body?.email,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
  }
};

export const updateUserController = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { id } = req.params || {};
    const { role, status, password, email } = req.body || {};
    const result = await updateUser(id, {
      role,
      status,
      password,
      email,
      tenantId: req.tenantId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error, {
      id: req.params?.id,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
  }
};

export const inactivateUserController = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { id } = req.params || {};
    const result = await inactivateUser(id, req.tenantId);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error, {
      id: req.params?.id,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
  }
};

export const reactivateUserController = async (req, res) => {
  if (!ensureTenantAuthorization(req, res)) return;
  try {
    const { id } = req.params || {};
    const result = await reactivateUser(id, req.tenantId);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error, {
      id: req.params?.id,
      tenantId: req.tenantId,
      userId: req.user?.id,
    });
  }
};

