import { Router } from "express";
import * as configuracaoEventoController from "../controllers/configuracaoEventoController.js";

const router = Router();

router.get("/eventos", configuracaoEventoController.listEvents);
router.post("/eventos", configuracaoEventoController.createEvent);
router.put("/eventos/:id", configuracaoEventoController.updateEvent);

router.get("/eventos/mapeamentos", configuracaoEventoController.listMappings);
router.post("/eventos/mapeamentos", configuracaoEventoController.createMapping);
router.put(
  "/eventos/mapeamentos/:id",
  configuracaoEventoController.updateMapping
);
router.delete(
  "/eventos/mapeamentos/:id",
  configuracaoEventoController.deleteMapping
);

router.get("/eventos/providencias", configuracaoEventoController.listEventoProvidencias);
router.post("/eventos/providencias", configuracaoEventoController.createEventoProvidencia);
router.put(
  "/eventos/providencias/:id",
  configuracaoEventoController.updateEventoProvidencia
);
router.delete(
  "/eventos/providencias/:id",
  configuracaoEventoController.deleteEventoProvidencia
);

export default router;
