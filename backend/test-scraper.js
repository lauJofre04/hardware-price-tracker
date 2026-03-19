const { chromium } = require('playwright');
const pool = require('./src/config/db');

async function ejecutarScraperDinamico() {
    let browser;

    try {
        console.log('📡 Consultando base de datos...');
        
        // 1. Buscamos TODOS los links activos en la BD
        const { rows: links } = await pool.query(`
            SELECT psl.id, psl.product_url, p.name 
            FROM product_shop_links psl
            JOIN products p ON psl.product_id = p.id
            WHERE psl.is_active = true
        `);

        if (links.length === 0) {
            console.log('⚠️ No hay productos configurados para scrapear.');
            return;
        }

        console.log(`🚀 Iniciando ruta para ${links.length} producto(s)...`);
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // 2. Bucle iterativo: Visitamos cada URL
        for (const link of links) {
            console.log(`\n🔍 Evaluando: ${link.name}`);
            
            try {
                await page.goto(link.product_url, { waitUntil: 'networkidle' });

                // Extraemos el precio con la lógica que ya dominamos
                const elementoPrecio = page.locator('span[class*="tw:text-price"]').filter({ hasText: /[0-9]/ }).first(); 
                await elementoPrecio.waitFor({ state: 'visible', timeout: 5000 });
                const textoPrecio = await elementoPrecio.innerText();
                const precioLimpio = parseInt(textoPrecio.replace(/[^0-9]/g, ''), 10);

                console.log(`💰 Precio capturado: $${precioLimpio}`);

                // A. Guardamos en el historial (Para el gráfico de Recharts)
                await pool.query(`
                    INSERT INTO price_history (product_shop_id, price) 
                    VALUES ($1, $2)
                `, [link.id, precioLimpio]);

                // B. Actualizamos el precio más reciente en la tabla general
                await pool.query(`
                    UPDATE product_shop_links 
                    SET last_price = $1 
                    WHERE id = $2
                `, [precioLimpio, link.id]);

                console.log('✅ Base de datos actualizada.');

            } catch (error) {
                // Si un producto se queda sin stock o cambia la web, falla acá, 
                // pero el "continue" permite que el script siga con el PRÓXIMO producto.
                console.error(`❌ Falló la extracción para ${link.name}. Motivo: Timeout o sin stock.`);
                continue; 
            }
        }

    } catch (error) {
        console.error('❌ Error crítico en el scraper:', error.message);
    } finally {
        if (browser) await browser.close();
        pool.end();
        console.log('\n🛑 Proceso dinámico finalizado.');
    }
}

ejecutarScraperDinamico();