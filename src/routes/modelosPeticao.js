import express from "express";
import { tenantContextMiddleware } from "../middlewares/tenantContextMiddleware.js";
import * as modelosController from "../controllers/modelosPeticaoController.js";

const router = express.Router();

router.use(tenantContextMiddleware);

router.post("/", modelosController.create);
router.get("/", modelosController.getAll);
router.get("/:id", modelosController.getById);
router.put("/:id", modelosController.update);
router.delete("/:id", modelosController.remove);

export default router;