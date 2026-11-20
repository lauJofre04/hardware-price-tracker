const pool = require('../config/db');

async function listar() {
    const { rows } = await pool.query('SELECT id, name FROM shops');
    return rows;
}

async function buscarPorId(id) {
    const { rows } = await pool.query('SELECT name FROM shops WHERE id = $1', [id]);
    return rows[0] || null;
}

module.exports = { listar, buscarPorId };
