import { Router } from 'express';
import { PublicacaoController } from '../controllers/publicacaoController.js';

const router = Router();

router.post(
  '/verificar-duplicidade',
  PublicacaoController.verificarDuplicidade
);

router.post(
  '/similaridade',
  PublicacaoController.verificarSimilaridadeEmLote
);

export default router;
