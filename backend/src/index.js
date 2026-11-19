require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const pool = require('./config/db');
const { ensureDbSchema } = require('./config/schema');
const verificarToken = require('./middleware/auth');
const { crearLimitador } = require('./middleware/rateLimit');
const { scrapeOnDemand, scrapeAllProducts, ScrapeEnCursoError } = require('./services/scraperServices');
const { buscarEnMercadoLibre } = require('./services/mlSearch');
const { validarUrlProducto, parseId, textoCorto } = require('./utils/validators');
const { origenPermitido } = require('./utils/cors');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ Falta JWT_SECRET (mínimo 32 caracteres) en las variables de entorno.');
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const ESPERA_MAX_SCRAPE_MS = 20000; // cuánto espera POST /api/products al primer precio

const app = express();
app.set('trust proxy', 1); // detrás de un proxy (Render), para que req.ip sea la IP real

// ==========================================
// Middlewares
// ==========================================
app.use(cors({
    origin: (origin, callback) => {
        if (origenPermitido(origin)) return callback(null, true);
        // Se rechaza sin lanzar error (antes dejaba un stack trace por cada petición) y se registra
        // el origen para poder agregarlo a CORS_ORIGIN si es legítimo.
        console.warn(`🚫 CORS: origen no permitido: ${origin}`);
        callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '100kb' }));

const limitarLogin = crearLimitador({
    ventanaMs: 15 * 60 * 1000,
    maximo: 10,
    mensaje: 'Demasiados intentos. Probá de nuevo en unos minutos.'
});
const limitarBusquedas = crearLimitador({
    ventanaMs: 10 * 60 * 1000,
    maximo: 20,
    mensaje: 'Demasiadas búsquedas. Esperá unos minutos.'
});

// ==========================================
// Rutas
// ==========================================
app.post('/api/auth/login', limitarLogin, async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        // Mismo mensaje para usuario inexistente y contraseña incorrecta (evita enumerar usuarios)
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, message: '¡Bienvenido administrador!' });
    } catch (error) {
        console.error('🚨 Error en el login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Verifica también la base de datos (útil para el health check de Render)
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', message: 'API del Rastreador de Precios funcionando 🚀' });
    } catch (error) {
        console.error('Health check: base de datos no disponible:', error.message);
        res.status(503).json({ status: 'ERROR', message: 'Base de datos no disponible' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query(`
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
            JOIN shops s ON psl.shop_id = s.id;
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener productos' });
    }
});

app.put('/api/products/:id/toggle-selection', verificarToken, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        const result = await pool.query(
            'UPDATE products SET is_selected = NOT is_selected WHERE id = $1 RETURNING is_selected',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        res.status(200).json({
            message: '✅ Estado de selección actualizado',
            is_selected: result.rows[0].is_selected
        });
    } catch (error) {
        console.error('Error al alternar selección del producto:', error);
        res.status(500).json({ error: 'Error al intentar cambiar la selección del producto' });
    }
});

// Actualiza ÚNICAMENTE el link de un producto
app.put('/api/products/:id', verificarToken, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        const { rows } = await pool.query(
            `SELECT psl.id, s.name AS shop_name
             FROM product_shop_links psl JOIN shops s ON s.id = psl.shop_id
             WHERE psl.product_id = $1`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        const url = validarUrlProducto(req.body?.product_url, rows[0].shop_name);
        if (!url) {
            return res.status(400).json({ error: `El enlace debe ser una URL https de ${rows[0].shop_name}` });
        }

        await pool.query('UPDATE product_shop_links SET product_url = $1 WHERE id = $2', [url, rows[0].id]);
        res.status(200).json({ message: '✅ Enlace actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar enlace:', error);
        res.status(500).json({ error: 'Error al intentar actualizar el producto' });
    }
});

// Historial de precios de un PRODUCTO (el gráfico del frontend pasa product_id).
// Antes se filtraba por el id del link, que solo coincidía mientras ambas secuencias iban sincronizadas.
app.get('/api/products/:id/history', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        const result = await pool.query(
            `SELECT ph.price, ph.recorded_at
             FROM price_history ph
             JOIN product_shop_links psl ON psl.id = ph.product_shop_id
             WHERE psl.product_id = $1
             ORDER BY ph.recorded_at ASC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error al consultar historial:', error);
        res.status(500).json({ error: 'Error interno al obtener el historial' });
    }
});

app.get('/api/shops', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM shops');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener tiendas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Agrega un producto y trata de scrapearlo al instante
app.post('/api/products', verificarToken, async (req, res) => {
    const body = req.body || {};
    const name = textoCorto(body.name, { min: 1, max: 255 });
    const category = body.category ? textoCorto(body.category, { max: 100 }) : '';
    const brand = body.brand ? textoCorto(body.brand, { max: 100 }) : '';
    const shopId = parseId(body.shop_id);

    if (!name || category === null || brand === null || !shopId) {
        return res.status(400).json({ error: 'Datos inválidos: revisá nombre, categoría, marca y tienda' });
    }

    const client = await pool.connect();
    try {
        const shopRes = await client.query('SELECT name FROM shops WHERE id = $1', [shopId]);
        if (shopRes.rows.length === 0) return res.status(400).json({ error: 'La tienda indicada no existe' });
        const shopName = shopRes.rows[0].name;

        const productUrl = validarUrlProducto(body.product_url, shopName);
        if (!productUrl) {
            return res.status(400).json({ error: `El enlace debe ser una URL https de ${shopName}` });
        }

        // Producto + link en una transacción: o se crean los dos o ninguno
        let linkId;
        try {
            await client.query('BEGIN');
            const productRes = await client.query(
                'INSERT INTO products (name, category, brand) VALUES ($1, $2, $3) RETURNING id',
                [name, category || null, brand || null]
            );
            const linkRes = await client.query(
                'INSERT INTO product_shop_links (product_id, shop_id, product_url) VALUES ($1, $2, $3) RETURNING id',
                [productRes.rows[0].id, shopId, productUrl]
            );
            linkId = linkRes.rows[0].id;
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        }

        // Espera el primer precio como máximo ESPERA_MAX_SCRAPE_MS. Si tarda más, responde igual
        // y el scrapeo termina en segundo plano (scrapeOnDemand nunca lanza: captura sus errores).
        const scrapeo = scrapeOnDemand(linkId, productUrl, shopName, name);
        const price = await Promise.race([
            scrapeo,
            new Promise((resolve) => setTimeout(() => resolve(undefined), ESPERA_MAX_SCRAPE_MS))
        ]);

        res.status(201).json({
            message: price === undefined
                ? '✅ Producto agregado. El precio se está buscando y aparecerá en unos instantes.'
                : '✅ Producto agregado y scrapeado',
            price: price ?? null
        });
    } catch (error) {
        console.error('Error al guardar producto:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    } finally {
        client.release();
    }
});

app.post('/api/scrape-all', verificarToken, async (req, res) => {
    try {
        const actualizados = await scrapeAllProducts();
        res.status(200).json({ message: `Scraping masivo completado. ${actualizados} precios actualizados.` });
    } catch (error) {
        if (error instanceof ScrapeEnCursoError) {
            return res.status(409).json({ error: 'Ya hay una actualización en curso. Esperá a que termine.' });
        }
        console.error('Error en el endpoint de scrape-all:', error);
        res.status(500).json({ error: 'Error al ejecutar la actualización masiva' });
    }
});

app.delete('/api/products/:id', verificarToken, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        // ON DELETE CASCADE limpia links e historial
        const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.status(200).json({ message: '✅ Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al intentar eliminar el producto' });
    }
});

// Búsqueda en vivo en Mercado Libre (abre un navegador: una sola a la vez y con límite por IP)
let busquedaEnCurso = false;
app.get('/api/search/ml', verificarToken, limitarBusquedas, async (req, res) => {
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
});

// ==========================================
// Arranque
// ==========================================
function programarCron() {
    if (process.env.ENABLE_CRON === 'false') {
        console.log('⏰ Cron desactivado (ENABLE_CRON=false).');
        return;
    }
    // 12:00 y 17:00 hora Argentina, sin depender de la zona horaria del servidor
    cron.schedule('0 12,17 * * *', async () => {
        console.log('⏰ [CRON] Iniciando actualización automática...');
        try {
            const actualizados = await scrapeAllProducts();
            console.log(`✅ [CRON] ${actualizados} productos actualizados.`);
        } catch (error) {
            if (error instanceof ScrapeEnCursoError) {
                console.log('⏭️ [CRON] Ya había una actualización en curso; se omite esta corrida.');
            } else {
                console.error('❌ [CRON] Error en la actualización automática:', error.message);
            }
        }
    }, { timezone: 'America/Argentina/Buenos_Aires' });
}

async function iniciar() {
    try {
        await ensureDbSchema(pool); // una sola vez al arrancar (antes se ejecutaba en cada request)
        console.log('✅ Esquema de base de datos verificado.');
    } catch (error) {
        console.error('❌ No se pudo verificar la base de datos:', error.message);
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
        programarCron();
    });
}

iniciar();
