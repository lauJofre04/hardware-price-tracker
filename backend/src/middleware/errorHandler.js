// Rutas inexistentes: JSON en vez del HTML por defecto de Express
function noEncontrado(req, res) {
    res.status(404).json({ error: 'Ruta no encontrada' });
}

// Cualquier error no capturado (por ejemplo, un JSON mal formado en el body)
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });

    console.error('Error no controlado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { noEncontrado, manejarErrores };
