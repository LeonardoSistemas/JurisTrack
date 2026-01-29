import express from "express";
import {
  listarProcessos,
  obterProcesso,
  criarProcesso,
  atualizarProcesso,
  excluirProcesso,
  criarAndamentoManual,
  obterContextoModelo,
  criarPrazo,
  atualizarStatusPrazo
} from "../controllers/processosController.js";

const router = express.Router();

router.get("/", listarProcessos);
router.get("/:id", obterProcesso);
router.post("/", criarProcesso);
router.put("/:id", atualizarProcesso);
router.delete("/:id", excluirProcesso);

// Rota para o botão "Salvar Andamento"
router.post("/andamento", criarAndamentoManual);
router.post("/prazo", criarPrazo);
router.patch("/prazo/:id/status", atualizarStatusPrazo);

router.get("/:id/contexto-modelo", obterContextoModelo);

export default router;