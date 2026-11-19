const pool = require('../config/db');

async function listar() {
    const { rows } = await pool.query(`
        SELECT
            p.id as product_id,
            p.name as product_name,
            p.category,
            p.brand,
            s.name as shop_name,
            psl.last_price,
            psl.product_url,
            p.is_selected
        FROM products p
        JOIN product_shop_links psl ON p.id = psl.product_id
        JOIN shops s ON psl.shop_id = s.id
    `);
    return rows;
}

// Devuelve el nuevo estado, o null si el producto no existe
async function alternarSeleccion(id) {
    const { rows } = await pool.query(
        'UPDATE products SET is_selected = NOT is_selected WHERE id = $1 RETURNING is_selected',
        [id]
    );
    return rows.length ? rows[0].is_selected : null;
}

async function linksDeProducto(productId) {
    const { rows } = await pool.query(
        `SELECT psl.id, s.name AS shop_name
         FROM product_shop_links psl JOIN shops s ON s.id = psl.shop_id
         WHERE psl.product_id = $1`,
        [productId]
    );
    return rows;
}

async function actualizarUrlDeLink(linkId, url) {
    await pool.query('UPDATE product_shop_links SET product_url = $1 WHERE id = $2', [url, linkId]);
}

// Historial de TODOS los links del producto (el gráfico trabaja por product_id)
async function historial(productId) {
    const { rows } = await pool.query(
        `SELECT ph.price, ph.recorded_at
         FROM price_history ph
         JOIN product_shop_links psl ON psl.id = ph.product_shop_id
         WHERE psl.product_id = $1
         ORDER BY ph.recorded_at ASC`,
        [productId]
    );
    return rows;
}

// Producto + link en una transacción: o se crean los dos o ninguno. Devuelve el id del link.
async function crearConLink({ name, category, brand, shopId, url }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const producto = await client.query(
            'INSERT INTO products (name, category, brand) VALUES ($1, $2, $3) RETURNING id',
            [name, category, brand]
        );
        const link = await client.query(
            'INSERT INTO product_shop_links (product_id, shop_id, product_url) VALUES ($1, $2, $3) RETURNING id',
            [producto.rows[0].id, shopId, url]
        );
        await client.query('COMMIT');
        return link.rows[0].id;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

// ON DELETE CASCADE limpia links e historial. Devuelve true si existía.
async function eliminar(id) {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return result.rowCount > 0;
}

module.exports = { listar, alternarSeleccion, linksDeProducto, actualizarUrlDeLink, historial, crearConLink, eliminar };
