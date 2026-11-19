// Esquema de la base de datos. Todo es idempotente: se puede ejecutar en cada arranque.
const ESQUEMA_SQL = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        brand VARCHAR(100),
        image_url TEXT,
        is_selected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        base_url TEXT NOT NULL,
        logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS product_shop_links (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        shop_id INT REFERENCES shops(id) ON DELETE CASCADE,
        product_url TEXT NOT NULL,
        last_price DECIMAL(12, 2),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(product_id, shop_id)
    );

    CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        product_shop_id INT REFERENCES product_shop_links(id) ON DELETE CASCADE,
        price DECIMAL(12, 2) NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Bases creadas con versiones anteriores
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT FALSE;
    ALTER TABLE product_shop_links ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

    -- El historial se consulta siempre por link y ordenado por fecha
    CREATE INDEX IF NOT EXISTS idx_price_history_link_fecha
        ON price_history (product_shop_id, recorded_at);
`;

const TIENDAS_BASE = [
    ['Compra Gamer', 'https://compragamer.com'],
    ['Mercado Libre', 'https://www.mercadolibre.com.ar']
];

async function ensureDbSchema(db) {
    await db.query(ESQUEMA_SQL);
    for (const [nombre, url] of TIENDAS_BASE) {
        await db.query(
            `INSERT INTO shops (name, base_url)
             SELECT $1::varchar, $2::text
             WHERE NOT EXISTS (SELECT 1 FROM shops WHERE name = $1::varchar)`,
            [nombre, url]
        );
    }
}

module.exports = { ensureDbSchema, ESQUEMA_SQL, TIENDAS_BASE };
