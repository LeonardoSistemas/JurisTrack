import express from "express";
import {
  cadastrar,
  cancelar,
  listarPendentes,
} from "../controllers/conciliacaoController.js";

const router = express.Router();

router.post("/conciliar/cadastrar", cadastrar);
router.post("/conciliar/cancelar", cancelar);
router.get("/itens/:uploadId", listarPendentes);

export default router;
