import express from "express";
import { upload } from "../middlewares/multer.js";
import * as feriadoController from "../controllers/feriadoController.js";

const router = express.Router();

// Rota para upload de feriados manuais
// Exemplo: POST /api/feriados/upload
router.post("/upload", upload.single("file"), feriadoController.uploadFeriados);

export default router;
