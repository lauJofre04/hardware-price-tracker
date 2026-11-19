const pool = require('../config/db');
const { ensureDbSchema } = require('../config/schema');

(async () => {
    try {
        console.log('⏳ Creando tablas en la base de datos...');
        await ensureDbSchema(pool);
        console.log('✅ Tablas, índices y tiendas base listos.');
    } catch (error) {
        console.error('❌ Error creando las tablas:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
})();
