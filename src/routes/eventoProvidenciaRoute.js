import { Router } from "express";
import * as eventoProvidenciaController from "../controllers/eventoProvidenciaController.js";

const router = Router();

router.get("/sugestao/:idItem", eventoProvidenciaController.getSugestao);
router.post("/confirmar", eventoProvidenciaController.confirmar);

export default router;
