const pool = require('../config/db');

async function buscarPorUsername(username) {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
}

module.exports = { buscarPorUsername };
