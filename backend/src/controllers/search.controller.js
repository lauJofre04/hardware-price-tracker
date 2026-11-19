const { buscarEnMercadoLibre } = require('../services/mlSearch');
const { textoCorto } = require('../utils/validators');

// Abre un navegador: una sola búsqueda a la vez (además del límite por IP en la ruta)
let busquedaEnCurso = false;

async function buscarEnML(req, res) {
    const q = textoCorto(req.query.q, { min: 2, max: 100 });
    if (!q) return res.status(400).json({ error: 'El término de búsqueda debe tener entre 2 y 100 caracteres' });

    if (busquedaEnCurso) {
        return res.status(429).json({ error: 'Ya hay una búsqueda en curso. Probá de nuevo en unos segundos.' });
    }

    busquedaEnCurso = true;
    try {
        console.log(`🔎 Cazador buscando: "${q}"...`);
        const product = await buscarEnMercadoLibre(q);
        if (!product) return res.status(200).json({ found: false, message: 'No se encontraron resultados' });
        res.status(200).json({ found: true, product });
    } catch (error) {
        console.error('❌ Error en el Cazador:', error.message);
        res.status(500).json({ error: 'Error al buscar en Mercado Libre' });
    } finally {
        busquedaEnCurso = false;
    }
}

module.exports = { buscarEnML };
