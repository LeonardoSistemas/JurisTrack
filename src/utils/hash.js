import crypto from 'crypto';
import { normalizarData } from './normalizarData.js';
import { normalizarTexto } from './normalizarTexto.js';
import { logInfo } from './logger.js';

export function gerarHashPublicacao({
  tenant_id,
  numero_processo,
  data_publicacao,
  texto
}) {  
  if (!tenant_id || !data_publicacao || !texto) {
    throw new Error('Dados obrigatórios ausentes para geração de hash da publicação');
  }

  const dataNormalizada = normalizarData(data_publicacao);
  const textoNormalizado = normalizarTexto(texto);
  const numeroNormalizado = numero_processo ? String(numero_processo) : '';

  const base = [
    tenant_id,
    numeroNormalizado,
    dataNormalizada,
    textoNormalizado
  ].join('|');

  const hash = crypto
    .createHash('sha256')
    .update(base)
    .digest('hex');

  logInfo('hash.publicacao', 'Hash gerado para publicação', {
    tenant_id,
    numero_processo: numeroNormalizado,
    data_publicacao: dataNormalizada,
    texto_normalizado_tamanho: textoNormalizado.length,
    texto_normalizado_preview: textoNormalizado.slice(0, 200),
    base,
    hash
  });

  return hash;
}
