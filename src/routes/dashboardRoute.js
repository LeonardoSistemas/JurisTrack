import express from "express";
import {
  getSummary,
  getPrazosDetalhes,
  getAndamentosDetalhes,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/summary", getSummary);
router.get("/prazos-detalhes", getPrazosDetalhes);
router.get("/andamentos-detalhes", getAndamentosDetalhes);

export default router;


