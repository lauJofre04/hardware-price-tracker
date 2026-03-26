const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { chromium } = require('playwright'); // Traemos la conexión a PostgreSQL
require('dotenv').config();

const app = express();
const PORT = process.env.DB_PORT || 3000;

const cron = require('node-cron');
const { exec } = require('child_process');
const { scrapeOnDemand, scrapeAllProducts } = require('./services/scraperServices');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const verificarToken = require('./middleware/auth'); // Nuestro guardia

// ==========================================
// TAREAS AUTOMÁTICAS (CRON JOBS)
// ==========================================

// Este formato '0 3 * * *' significa: "Ejecutar todos los días a las 03:00 AM"
// Para probarlo AHORA MISMO, podés usar '*/2 * * * *' (se ejecuta cada 2 minutos)
cron.schedule('0 3 * * *', () => {
    console.log('⏰ [CRON] Iniciando el Rastreador de Precios automático...');
    
    // Ejecutamos el script que acabás de crear como si lo escribieras en la consola
    exec('node test-scraper.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ [CRON] Error ejecutando el scraper: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ [CRON] Advertencia en el scraper: ${stderr}`);
        }
        console.log(`✅ [CRON] Scraper finalizado. Resultado:\n${stdout}`);
    });
});

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend
app.use(express.json()); // Permite recibir datos en formato JSON

// Ruta para iniciar sesión y obtener el Token
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        // Si la contraseña es correcta, le fabricamos un pase VIP (Token) que dura 24 horas
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, message: '¡Bienvenido administrador!' });
    } catch (error) {
        // AGREGAMOS ESTA LÍNEA PARA VER EL ERROR REAL EN LA TERMINAL:
        console.error('🚨 Error detallado en el login:', error); 
        
        res.status(500).json({ error: 'Error en el servidor' });
    }
});
// ==========================================
// RUTAS DE LA API (Endpoints)
// ==========================================

// Ruta básica para verificar que la API funciona
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API del Rastreador de Precios funcionando 🚀' });
});

// Ruta para obtener todos los productos y su último precio
app.get('/api/products', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.category,
                p.brand,
                s.name as shop_name,
                psl.last_price,
                psl.product_url
            FROM products p
            JOIN product_shop_links psl ON p.id = psl.product_id
            JOIN shops s ON psl.shop_id = s.id;
        `;
        const result = await pool.query(query);
        res.json(result.rows); // Devolvemos los datos como JSON
    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener productos' });
    }
});
// Ruta para actualizar ÚNICAMENTE el link de un producto
app.put('/api/products/:id', verificarToken, async (req, res) => {
    const { id } = req.params; // El ID del producto
    const { product_url } = req.body; // El nuevo link

    try {
        await pool.query(
            'UPDATE product_shop_links SET product_url = $1 WHERE product_id = $2',
            [product_url, id]
        );
        res.status(200).json({ message: '✅ Enlace actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar enlace:', error);
        res.status(500).json({ error: 'Error al intentar actualizar el producto' });
    }
});

// Ruta para obtener el historial de precios de un producto específico (Para el gráfico)
app.get('/api/products/:shopLinkId/history',  async (req, res) => {
    const { shopLinkId } = req.params;
    try {
        const query = `
            SELECT price, recorded_at 
            FROM price_history 
            WHERE product_shop_id = $1 
            ORDER BY recorded_at ASC;
        `;
        const result = await pool.query(query, [shopLinkId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al consultar historial:', error);
        res.status(500).json({ error: 'Error interno al obtener el historial' });
    }
});

// Ruta para obtener las tiendas disponibles (Para el select del formulario)
app.get('/api/shops', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM shops');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener tiendas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para agregar un nuevo producto y Scrapearlo AL INSTANTE
app.post('/api/products', verificarToken, async (req, res) => {
    const { name, category, brand, shop_id, product_url } = req.body;
    
    try {
        // 1. Averiguamos el nombre de la tienda para saber qué scraper usar
        const shopRes = await pool.query('SELECT name FROM shops WHERE id = $1', [shop_id]);
        const shopName = shopRes.rows[0].name;

        // 2. Insertamos el producto general
        const productRes = await pool.query(
            `INSERT INTO products (name, category, brand) VALUES ($1, $2, $3) RETURNING id`,
            [name, category, brand]
        );
        const productId = productRes.rows[0].id;

        // 3. Lo vinculamos a la tienda y OBTENEMOS EL ID DEL LINK (fundamental)
        const linkRes = await pool.query(
            `INSERT INTO product_shop_links (product_id, shop_id, product_url) VALUES ($1, $2, $3) RETURNING id`,
            [productId, shop_id, product_url]
        );
        const linkId = linkRes.rows[0].id;

        // 4. 🔥 MAGIA REACTIVA: Ejecutamos el scraper acá mismo y esperamos a que termine
        const currentPrice = await scrapeOnDemand(linkId, product_url, shopName);

        res.status(201).json({ 
            message: '✅ Producto agregado y scrapeado',
            price: currentPrice
        });
    } catch (error) {
        console.error('Error al guardar/scrapear producto:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});
// Ruta para forzar el scrapeo de TODOS los productos
app.post('/api/scrape-all', verificarToken, async (req, res) => {
    try {
        const actualizados = await scrapeAllProducts();
        res.status(200).json({ 
            message: `Scraping masivo completado. ${actualizados} precios actualizados.` 
        });
    } catch (error) {
        console.error('Error en el endpoint de scrape-all:', error);
        res.status(500).json({ error: 'Error al ejecutar la actualización masiva' });
    }
});
// Ruta para eliminar un producto y todo su historial
app.delete('/api/products/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        // Gracias al ON DELETE CASCADE de la base de datos, 
        // borrar el producto limpia automáticamente la tabla de links y el historial.
        await pool.query('DELETE FROM products WHERE id = $1', [id]);
        
        res.status(200).json({ message: '✅ Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al intentar eliminar el producto' });
    }
});
// Ruta para buscar en vivo el mejor precio en Mercado Libre
// Ruta para buscar en vivo usando Playwright (Scraping de la web)
app.get('/api/search/ml', verificarToken, async (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Falta el término de búsqueda' });
    }

    let browser;
    try {
        console.log(`🔎 Cazador (Playwright) buscando: "${q}"...`);
        
        // 1. Levantamos el navegador invisible
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // 2. Transformamos el texto (ej: "Aula F75") al formato de URL de ML ("Aula-F75")
        const searchUrl = `https://listado.mercadolibre.com.ar/${q.trim().replace(/\s+/g, '-')}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        // 3. Buscamos la primera tarjeta de producto en el HTML
        const firstResult = await page.$('.ui-search-layout__item');

        if (firstResult) {
            // Extraemos título, link, precio e imagen
            // Le tiramos una red con todas las combinaciones posibles que usa Mercado Libre
            const title = await firstResult.evaluate((elemento) => {
                const nodoTitulo = elemento.querySelector('h2, h3, .poly-component__title, .ui-search-item__title');
                if (nodoTitulo && nodoTitulo.innerText) return nodoTitulo.innerText.trim();
                
                // Si falla lo anterior, leemos el texto directamente del enlace
                const nodoEnlace = elemento.querySelector('a.ui-search-link');
                if (nodoEnlace && nodoEnlace.innerText) return nodoEnlace.innerText.trim();
                
                return 'Sin título';
            }).catch(() => 'Sin título');
            // Le decimos que agarre el PRIMER enlace <a> que encuentre adentro de la tarjeta, sin importar qué clase tenga
            const link = await firstResult.evaluate((elemento) => {
                const nodoEnlace = elemento.querySelector('a');
                return nodoEnlace && nodoEnlace.href ? nodoEnlace.href : '';
            }).catch(() => '');
            // Extraemos el precio real ignorando los tachados y las cuotas
            const price = await firstResult.evaluate((elemento) => {
                // Agarramos todos los números de precio de la tarjeta
                const fracciones = Array.from(elemento.querySelectorAll('.andes-money-amount__fraction'));
                
                for (let frac of fracciones) {
                    // Si el número está dentro de una etiqueta <s> (tachado) o tiene clase strikethrough, lo ignoramos
                    if (frac.closest('s') || frac.closest('[class*="strikethrough"]')) continue;
                    
                    // Si el número está en la sección de cuotas (installment), lo ignoramos
                    if (frac.closest('[class*="installment"]')) continue;
                    
                    // El primer número que sobreviva a estos filtros es el precio de lista real
                    return parseInt(frac.innerText.replace(/\./g, ''));
                }
                return 0;
            }).catch(() => 0);
            
            // ML usa lazy-loading para las imágenes. Si no tiene 'src' real, buscamos en 'data-src'
            let thumbnail = await firstResult.$eval('img', el => el.getAttribute('src')).catch(() => '');
            if (thumbnail && thumbnail.includes('data:image')) {
                thumbnail = await firstResult.$eval('img', el => el.getAttribute('data-src')).catch(() => thumbnail);
            }

            res.status(200).json({
                found: true,
                product: { title, price, link, thumbnail }
            });
        } else {
            res.status(200).json({ found: false, message: 'No se encontraron resultados' });
        }

    } catch (error) {
        console.error('❌ Error en el Cazador Playwright:', error);
        res.status(500).json({ error: 'Error al scrapear Mercado Libre' });
    } finally {
        // MUY IMPORTANTE: Cerramos el navegador siempre, haya error o no
        if (browser) await browser.close();
    }
});
// ==========================================
// INICIAR SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
    console.log(`🔗 Endpoint de prueba: http://localhost:${PORT}/api/products`);
    console.log(`=========================================`);
});