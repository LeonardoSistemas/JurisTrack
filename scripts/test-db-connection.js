import { fileURLToPath } from 'node:url';
import { pool } from '../src/config/postgresClient.js';

export async function testarConexao() {
  console.log('Testando conexão com o banco de dados...');
  try {
    const result = await pool.query('select 1 as ok');
    console.log('✅ Conexão com o banco OK:', result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao conectar no banco:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await testarConexao();
  } finally {
    await pool.end();
  }
}

const arquivoAtual = fileURLToPath(import.meta.url);

if (process.argv[1] === arquivoAtual) {
  main().catch((error) => {
    console.error('Falha ao executar o teste de conexão:', error.message);
    process.exit(1);
  });
}
