import pkg from 'pg';
import env from 'dotenv';

env.config();

const { Pool } = pkg;
const connectionString =
  process.env.POSTGRES_CONNECTION_STRING ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'É necessário definir a variável de ambiente POSTGRES_CONNECTION_STRING ou DATABASE_URL.'
  );
}

export const pool = new Pool({
  connectionString,
  ssl: false,
});

export default pool;