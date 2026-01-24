import { Router } from "express";
import * as configuracaoProvidenciaController from "../controllers/configuracaoProvidenciaController.js";

const router = Router();

router.get("/providencias", configuracaoProvidenciaController.listProvidencias);
router.post("/providencias", configuracaoProvidenciaController.createProvidencia);

router.get(
  "/providencias/:id/checklist",
  configuracaoProvidenciaController.listChecklistItems
);
router.post(
  "/providencias/:id/checklist",
  configuracaoProvidenciaController.createChecklistItem
);
router.put(
  "/providencias/checklist/:itemId",
  configuracaoProvidenciaController.updateChecklistItem
);
router.delete(
  "/providencias/checklist/:itemId",
  configuracaoProvidenciaController.deleteChecklistItem
);

router.get(
  "/providencias/:id/modelos",
  configuracaoProvidenciaController.listProvidenciaModels
);
router.post(
  "/providencias/:id/modelos",
  configuracaoProvidenciaController.addProvidenciaModel
);
router.delete(
  "/providencias/:id/modelos/:modeloId",
  configuracaoProvidenciaController.removeProvidenciaModel
);

export default router;
