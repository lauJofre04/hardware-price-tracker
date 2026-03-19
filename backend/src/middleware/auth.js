const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    // El frontend nos va a mandar el token en los headers (Authorization: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '🛑 Acceso denegado. Falta el token de seguridad.' });
    }

    // Verificamos que el token sea nuestro y no esté vencido
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '🛑 Token inválido o expirado.' });
        
        req.user = user; // Guardamos los datos del usuario por si los necesitamos
        next(); // ¡Todo en orden! Lo dejamos pasar a la ruta
    });
}

module.exports = verificarToken;