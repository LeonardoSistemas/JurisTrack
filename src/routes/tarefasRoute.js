import { Router } from "express";
import * as tarefasController from "../controllers/tarefasController.js";

const router = Router();

router.get("/", tarefasController.list);
router.get("/:id", tarefasController.getDetails);
router.patch("/:id/atribuir", tarefasController.assign);

export default router;
