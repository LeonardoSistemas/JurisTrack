import { Router } from "express";
import * as tarefasController from "../controllers/tarefasController.js";

const router = Router();

router.get("/", tarefasController.list);
router.get("/:id", tarefasController.getDetails);
router.patch("/:id/atribuir", tarefasController.assign);
router.get("/:id/checklist", tarefasController.listChecklist);
router.put("/:id/checklist/:itemId", tarefasController.updateChecklist);
router.post("/:id/checklist", tarefasController.createChecklist);
router.delete("/:id/checklist/:itemId", tarefasController.deleteChecklist);
router.patch("/:id/status", tarefasController.updateStatus);

export default router;
