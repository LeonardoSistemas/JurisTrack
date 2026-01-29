import express from "express";
import { upload, uploadPdf } from "../middlewares/multer.js";
import { tenantContextMiddleware } from "../middlewares/tenantContextMiddleware.js";
import * as uploadController from "../controllers/uploadController.js";

const router = express.Router();

router.use(tenantContextMiddleware);

// Rotas (Upload IA / upload_Documentos)
router.post("/", upload.single("file"), uploadController.uploadFile);
router.post("/analise", uploadPdf.single("file"), uploadController.uploadFile);
router.get("/publicacoes", uploadController.listPublications);
router.delete("/:id", uploadController.deleteFile);

// --- NOVAS (Ficha Processo / processo_Doc) ---
router.post("/processo-doc", upload.single("file"), uploadController.uploadToProcessoDoc);
router.get("/processo-doc/:processoId", uploadController.listDocsProcesso);
router.delete("/processo-doc/:id", uploadController.deleteDocProcesso);

export default router;
