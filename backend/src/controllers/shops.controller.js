const shops = require('../repositories/shops');

async function listar(req, res) {
    try {
        res.json(await shops.listar());
    } catch (error) {
        console.error('Error al obtener tiendas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

module.exports = { listar };
