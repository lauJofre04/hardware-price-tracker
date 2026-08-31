const { chromium } = require('playwright');
const pool = require('../config/db');
const { enviarAlertaTelegram, enviarResumenPresupuesto } = require('./telegramService');

async function parsePriceText(texto) {
    if (!texto) return null;

    const normalized = texto
        .replace(/\s+/g, ' ')
        .trim();

    const pricePatterns = [
        /\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?/g,
        /(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?\s*(?:ARS|AR$|ARG)/gi,
        /\b(\d{1,3}(?:\.\d{3})+|\d+)\b/g
    ];

    for (const pattern of pricePatterns) {
        const match = normalized.match(pattern);
        if (!match) continue;

        const candidate = match[match.length - 1]
            .replace(/[^0-9]/g, '');

        if (candidate && Number(candidate) > 0) {
            return Number(candidate);
        }
    }

    return null;
}

async function scrapeOnDemand(linkId, url, shopName, productName) {
    let browser;
    try {
        console.log(`\n🤖 Iniciando actualización para: ${shopName}...`);
        let precioLimpio = null;

        if (shopName === 'Mercado Libre') {
            console.log('⚡ Plan D: Camuflaje ninja y extracción de HTML crudo...');

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3'
                    }
                });

                const html = await response.text();
                const pricePatterns = [
                    /<meta\s+itemprop="price"\s+content="(\d+(?:\.\d+)?)"/i,
                    /"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/i,
                    /"priceValue"\s*:\s*"?(\d+(?:\.\d+)?)"?/i,
                    /\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?/i
                ];

                for (const pattern of pricePatterns) {
                    const match = html.match(pattern);
                    if (match && match[1]) {
                        const numero = Number(match[1].replace(/\./g, ''));
                        if (Number.isFinite(numero) && numero > 0) {
                            precioLimpio = numero;
                            console.log(`🎯 ¡Bingo! Precio extraído del código fuente: $${precioLimpio}`);
                            break;
                        }
                    }
                }

                if (!precioLimpio) {
                    console.log('⚠️ El HTML cargó, pero no se encontró la etiqueta de precio en el HTML crudo.');
                }
            } catch (error) {
                console.error('❌ Error al descargar el HTML:', error.message);
            }
        }
        else if (shopName === 'Compra Gamer') {
            console.log('🕸️ Levantando navegador fantasma para Compra Gamer...');
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            if (url.includes('/armatupc')) {
                const bodyText = await page.locator('body').innerText();
                const totalMatch = bodyText.match(/Total:\s*\$?\s*([0-9\.]\d{0,3}(?:\.\d{3})*(?:,\d{2})?)/i);

                if (totalMatch && totalMatch[1]) {
                    precioLimpio = Number(totalMatch[1].replace(/\./g, '').replace(',', '.'));
                    console.log(`🎯 Precio detectado para armar PC: $${precioLimpio}`);
                }
            }

            if (!precioLimpio) {
                const candidateSelectors = [
                    'span[class*="tw:text-price"]',
                    '[class*="price"]',
                    '[data-testid*="price"]',
                    '.price',
                    'body'
                ];

                for (const selector of candidateSelectors) {
                    try {
                        const el = page.locator(selector).first();
                        const count = await el.count();
                        if (count === 0) continue;

                        const text = await el.innerText();
                        const parsed = await parsePriceText(text);
                        if (parsed) {
                            precioLimpio = parsed;
                            break;
                        }
                    } catch (error) {
                        // sigue intentando con los siguientes selectores
                    }
                }
            }

            if (!precioLimpio) {
                const bodyText = await page.locator('body').innerText();
                precioLimpio = await parsePriceText(bodyText);
            }
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
            
            return precioLimpio;
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
// Función para scrapear TODOS los productos activos
async function scrapeAllProducts() {
    try {
        console.log('🔄 Iniciando actualización masiva de precios...');
        
        // 🔥 CAMBIO: Agregamos "p.name as product_name" y el JOIN con la tabla products
        const { rows: links } = await pool.query(`
            SELECT psl.id, psl.product_url, s.name as shop_name, p.name as product_name
            FROM product_shop_links psl
            JOIN shops s ON psl.shop_id = s.id
            JOIN products p ON psl.product_id = p.id
            WHERE psl.is_active = true
        `);

        let actualizados = 0;

        for (const link of links) {
            // 🔥 CAMBIO: Ahora le pasamos el cuarto parámetro (link.product_name)
            const nuevoPrecio = await scrapeOnDemand(link.id, link.product_url, link.shop_name, link.product_name);
            if (nuevoPrecio) {
                actualizados++;
            }
        }

        const { rows: [resumen] } = await pool.query(`
            SELECT
                COALESCE(SUM(CAST(psl.last_price AS bigint)), 0) AS total_presupuesto,
                COUNT(*) AS cantidad_productos
            FROM product_shop_links psl
            JOIN products p ON psl.product_id = p.id
            WHERE psl.is_active = true AND p.is_selected = true
        `);

        const totalPresupuesto = Number(resumen?.total_presupuesto || 0);
        const cantidadProductos = Number(resumen?.cantidad_productos || 0);

        await enviarResumenPresupuesto(totalPresupuesto, cantidadProductos);

        console.log(`✅ Actualización masiva terminada. ${actualizados}/${links.length} exitosos.`);
        return actualizados;

    } catch (error) {
        console.error('❌ Error en el scraping masivo:', error.message);
        throw error;
    }
}

// Asegurate de exportar TAMBIÉN esta nueva función
module.exports = { scrapeOnDemand, scrapeAllProducts };
