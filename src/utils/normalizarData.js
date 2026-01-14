export function normalizarData(data) {
    if (!data) return '';
  
    // Caso: Date ou ISO string
    if (data instanceof Date || data.includes('T')) {
      const d = new Date(data);
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
  
    // Caso: DD/MM/YYYY
    if (data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
  
    // Fallback (já normalizado)
    return data;
  }
  