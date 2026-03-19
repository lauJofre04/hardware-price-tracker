const pool = require('../config/db');

const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        brand VARCHAR(100),
        image_url TEXT,
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

    CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        product_id INT REFERENCES products(id) ON DELETE CASCADE,
        target_price DECIMAL(12, 2) NOT NULL,
        is_triggered BOOLEAN DEFAULT FALSE,
        communication_channel VARCHAR(50) DEFAULT 'telegram',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

async function initDB() {
    try {
        console.log('⏳ Creando tablas en la base de datos...');
        await pool.query(createTablesQuery);
        console.log('✅ ¡Todas las tablas fueron creadas con éxito!');
        
        // Insertamos la tienda Compra Gamer por defecto para ya tenerla
        await pool.query(`
            INSERT INTO shops (name, base_url) 
            VALUES ('Compra Gamer', 'https://compragamer.com')
            ON CONFLICT DO NOTHING;
        `);
        console.log('🛒 Tienda "Compra Gamer" registrada.');

    } catch (error) {
        console.error('❌ Error creando las tablas:', error);
    } finally {
        pool.end(); // Cerramos la conexión para que el script termine
    }
}

initDB();