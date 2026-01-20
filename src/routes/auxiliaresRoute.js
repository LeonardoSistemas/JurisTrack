import express from "express";
import * as ctrl from "../controllers/auxiliaresController.js";

const router = express.Router();

// Configuração das tabelas auxiliares: [ROTA, TABELA_BD, CAMPO_ID]
const configs = [
  ["comarcas", "comarcas", "idcomarca"],
  ["tribunais", "tribunais", "idtribunal"],
  ["varas", "varas", "idvara"],
  ["instancias", "instancias", "idinstancia"],
  ["decisoes", "decisoes", "iddecisao"],
  ["tipos_acao", "tipos_acao", "idtipoacao"],
  ["ritos", "ritos", "idrito"],
  ["esferas", "esferas", "idesfera"],
  ["fases", "fases", "idfase"],
  ["situacoes", "situacoes", "idsituacao"],
  ["probabilidades", "probabilidades", "idprobabilidade"],
  ["moedas", "moedas", "idmoeda"],
  ["pessoas", "pessoas", "idpessoa"],
  ["TipoAndamento", "TipoAndamento", "id"]
];

configs.forEach(([rota, tabela, id]) => {
  router.get(`/${rota}`, ctrl.listar(tabela));
  router.post(`/${rota}`, ctrl.salvar(tabela, id));
  router.delete(`/${rota}/:id`, ctrl.excluir(tabela, id));
});

export default router;