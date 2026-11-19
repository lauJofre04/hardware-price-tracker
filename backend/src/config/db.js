const { Pool } = require('pg');
require('dotenv').config();

// SSL: activo por defecto y con verificación de certificado (Neon usa certificados válidos).
//   DB_SSL=false                      -> sin SSL (Postgres local)
//   DB_SSL_REJECT_UNAUTHORIZED=false  -> acepta certificados no verificables (no recomendado)
const usarSsl = process.env.DB_SSL !== 'false';
const ssl = usarSsl
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    ssl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
});

pool.on('connect', () => {
    console.log('✅ Conexión establecida con la base de datos PostgreSQL');
});

// Un cliente inactivo puede perder la conexión (ej: Neon suspende la base). El pool
// lo descarta y abre otro; no hace falta matar el servidor.
pool.on('error', (err) => {
    console.error('⚠️ Error en un cliente inactivo de PostgreSQL:', err.message);
});

module.exports = pool;
