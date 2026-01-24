import { Router } from "express";
import * as configuracaoEventoController from "../controllers/configuracaoEventoController.js";

const router = Router();

router.get("/eventos", configuracaoEventoController.listEvents);
router.post("/eventos", configuracaoEventoController.createEvent);
router.put("/eventos/:id", configuracaoEventoController.updateEvent);

router.get("/eventos/mapeamentos", configuracaoEventoController.listMappings);
router.post("/eventos/mapeamentos", configuracaoEventoController.createMapping);

export default router;
