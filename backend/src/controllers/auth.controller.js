const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const users = require('../repositories/users');

const MENSAJE_INVALIDO = 'Usuario o contraseña incorrectos';

async function login(req, res) {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    try {
        const user = await users.buscarPorUsername(username);
        // Mismo mensaje para usuario inexistente y contraseña incorrecta (evita enumerar usuarios)
        if (!user) return res.status(401).json({ error: MENSAJE_INVALIDO });
        if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: MENSAJE_INVALIDO });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, message: '¡Bienvenido administrador!' });
    } catch (error) {
        console.error('🚨 Error en el login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
}

module.exports = { login };
