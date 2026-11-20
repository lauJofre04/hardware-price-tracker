const pool = require('../config/db');

// Verifica también la base de datos (útil para el health check de Render)
async function health(req, res) {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', message: 'API del Rastreador de Precios funcionando 🚀' });
    } catch (error) {
        console.error('Health check: base de datos no disponible:', error.message);
        res.status(503).json({ status: 'ERROR', message: 'Base de datos no disponible' });
    }
}

module.exports = { health };
