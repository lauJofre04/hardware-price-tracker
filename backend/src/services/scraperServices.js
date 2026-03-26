const { chromium } = require('playwright');
const pool = require('../config/db');
const { enviarAlertaTelegram } = require('./telegramService'); // NUEVO

async function scrapeOnDemand(linkId, url, shopName, productName) {
    let browser;
    try {
        console.log(`\n🤖 Iniciando actualización para: ${shopName}...`);
        let precioLimpio = null;

        // ==========================================
        // ESTRATEGIA 1: API OFICIAL (Mercado Libre)
        // ==========================================
        // ==========================================
        // ESTRATEGIA 3: EXTRACCIÓN DE HTML CRUDO
        // ==========================================
        if (shopName === 'Mercado Libre') {
            console.log('⚡ Plan D: Camuflaje ninja y extracción de HTML crudo...');
            
            try {
                // Hacemos una petición directa haciéndonos pasar por un Chrome en Windows
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3'
                    }
                });
                
                const html = await response.text();
                
                // Buscamos EXACTAMENTE la etiqueta invisible de SEO en el texto crudo
                // Esto busca algo como: <meta itemprop="price" content="150000">
                const match = html.match(/<meta\s+itemprop="price"\s+content="(\d+(\.\d+)?)"/i);
                
                if (match && match[1]) {
                    precioLimpio = parseInt(match[1], 10);
                    console.log(`🎯 ¡Bingo! Precio extraído del código fuente: $${precioLimpio}`);
                } else {
                    console.log('⚠️ El HTML cargó, pero no se encontró la etiqueta de precio (¿Pausada?).');
                }
            } catch (error) {
                console.error('❌ Error al descargar el HTML:', error.message);
            }
        }
        // ==========================================
        // ESTRATEGIA 2: SCRAPING CLÁSICO (Compra Gamer)
        // ==========================================
        else if (shopName === 'Compra Gamer') {
            console.log('🕸️ Levantando navegador fantasma para Compra Gamer...');
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const el = page.locator('span[class*="tw:text-price"]').filter({ hasText: /[0-9]/ }).first();
            await el.waitFor({ state: 'visible', timeout: 5000 });
            const text = await el.innerText();
            precioLimpio = parseInt(text.replace(/[^0-9]/g, ''), 10);
        }

        // ==========================================
        // GUARDADO EN BASE DE DATOS Y ALERTAS
        // ==========================================
        if (precioLimpio) {
            console.log(`💰 ¡Precio encontrado! $${precioLimpio}. Guardando...`);
            
            // 1. Buscamos el precio anterior ANTES de pisarlo
            const resAnterior = await pool.query(`SELECT last_price FROM product_shop_links WHERE id = $1`, [linkId]);
            const precioAnterior = resAnterior.rows[0]?.last_price;

            // 2. Si hay precio anterior y el nuevo es DISTINTO (subió o bajó), disparamos la alerta
            if (precioAnterior && Number(precioLimpio) !== Number(precioAnterior)) {
                console.log(`🚨 CAMBIO DE PRECIO DETECTADO: De $${precioAnterior} a $${precioLimpio}`);
                await enviarAlertaTelegram(productName, shopName, precioAnterior, precioLimpio, url);
            }

            // 3. Guardamos el historial y actualizamos el precio actual
            await pool.query(`INSERT INTO price_history (product_shop_id, price) VALUES ($1, $2)`, [linkId, precioLimpio]);
            await pool.query(`UPDATE product_shop_links SET last_price = $1 WHERE id = $2`, [precioLimpio, linkId]);
            
            return precioLimpio;s
        }

    } catch (error) {
        console.error(`❌ Error actualizando ${shopName}:`, error.message);
        return null;
    } finally {
        // Solo cerramos el navegador si lo llegamos a abrir (Para Compra Gamer)
        if (browser) await browser.close();
    }
}
// Función para scrapear TODOS los productos activos
async function scrapeAllProducts() {
    try {
        console.log('🔄 Iniciando actualización masiva de precios...');
        
        // Buscamos todos los links junto con el nombre de su tienda
        const { rows: links } = await pool.query(`
            SELECT psl.id, psl.product_url, s.name as shop_name
            FROM product_shop_links psl
            JOIN shops s ON psl.shop_id = s.id
            WHERE psl.is_active = true
        `);

        let actualizados = 0;

        // Iteramos uno por uno y reutilizamos la función que ya tenemos
        for (const link of links) {
            const nuevoPrecio = await scrapeOnDemand(link.id, link.product_url, link.shop_name);
            if (nuevoPrecio) {
                actualizados++;
            }
        }

        console.log(`✅ Actualización masiva terminada. ${actualizados}/${links.length} exitosos.`);
        return actualizados;

    } catch (error) {
        console.error('❌ Error en el scraping masivo:', error.message);
        throw error;
    }
}

// Asegurate de exportar TAMBIÉN esta nueva función
module.exports = { scrapeOnDemand, scrapeAllProducts };
