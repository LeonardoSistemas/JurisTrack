import express from "express";
import { tenantContextMiddleware } from "../middlewares/tenantContextMiddleware.js";
import * as n8nController from "../controllers/n8nController.js";
import { similaridadeController } from "../controllers/similaridadeController.js";

const router = express.Router();

router.use(tenantContextMiddleware);

// AQUI OCORRE O ERRO: Se n8nController.completeProcess não existir, o servidor cai.
router.post("/complete", n8nController.completeProcess);
router.post("/similaridade", similaridadeController);

export default router;