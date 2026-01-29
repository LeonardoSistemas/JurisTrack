import express from "express";
import {
  cadastrar,
  cancelar,
  listarPendentes,
  obterPublicacaoVinculada,
} from "../controllers/conciliacaoController.js";

const router = express.Router();

router.post("/conciliar/cadastrar", cadastrar);
router.post("/conciliar/cancelar", cancelar);
router.get("/itens/:itemId/publicacao", obterPublicacaoVinculada);
router.get("/itens/:uploadId", listarPendentes);

export default router;
