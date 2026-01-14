export function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .replace(/-\s*\n\s*/g, '-')
      .replace(/\n+/g, ' ')
      .replace(/\s+([.,;:])/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();
  }
  