const { chromium } = require('playwright');
const pool = require('../config/db');
const { enviarAlertaTelegram, enviarResumenPresupuesto } = require('./telegramService');

const PLAYWRIGHT_BROWSER_ARGS = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'
];
const MAX_CONCURRENT_SCRAPES = 2;

function isLikelyYear(value, context = '') {
    if (value < 1900 || value > 2100) return false;

    const yearContext = /(?:año|year|modelo|model|fabricado|fabricación|lanzamiento|release|released)/i;
    const hasMoneyContext = /(?:\$|ARS|AR\$|ARG|precio|oferta|ahora|total|subtotal|desde|por)/i;

    if (yearContext.test(context) || (!hasMoneyContext.test(context) && String(value).length === 4)) {
        return true;
    }

    return false;
}

function parseNumericValue(raw) {
    if (!raw) return null;

    const cleaned = raw
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .replace(/[^0-9.]/g, '');

    if (!cleaned) return null;

    const value = Number(cleaned);
    return Number.isFinite(value) && value > 0 ? value : null;
}

async function parsePriceText(texto) {
    if (!texto) return null;

    const normalized = texto
        .replace(/\s+/g, ' ')
        .replace(/\u00a0/g, ' ')
        .trim();

    const moneyKeywords = /(?:\$|ARS|AR\$|ARG|precio|oferta|ahora|total|subtotal|desde|por|mejor precio|cuotas|s\/imp|final)/i;
    const rejectKeywords = /(?:sku|id|modelo|model|año|year|fabricado|fabricación|lanzamiento|release|released|capacidad|stock|cantidad)/i;

    const pricePatterns = [
        /\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?/gi,
        /(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?\s*(?:ARS|AR\$|ARG)/gi,
        /(?:precio|oferta|ahora|total|subtotal|desde|por|mejor precio|cuotas|s\/imp|final)\D{0,30}(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?/gi,
        /\b(\d{1,3}(?:\.\d{3})+|\d+)\b/g
    ];

    const candidates = [];

    for (const pattern of pricePatterns) {
        const matches = normalized.match(pattern) || [];
        for (const raw of matches) {
            const value = parseNumericValue(raw);
            if (value == null) continue;
            if (value < 100) continue;
            if (value >= 1900 && value <= 2100) continue;
            if (isLikelyYear(value, normalized)) continue;

            const matchIndex = normalized.indexOf(raw);
            const context = normalized.slice(Math.max(0, matchIndex - 60), Math.min(normalized.length, matchIndex + raw.length + 60));

            const hasMoneyContext = moneyKeywords.test(context);
            const hasRejectContext = rejectKeywords.test(context);

            if (!hasMoneyContext && value < 1000) continue;
            if (!hasMoneyContext && hasRejectContext) continue;
            if (!hasMoneyContext && value > 1000 && value <= 50000 && /(?:sku|id|modelo|model|año|year|fabricado|fabricación|lanzamiento|release|released)/i.test(context)) continue;

            candidates.push(value);
        }
    }

    if (!candidates.length) return null;

    return [...new Set(candidates)].sort((a, b) => b - a)[0];
}

function isValidPriceCandidate(value, context = '') {
    if (!Number.isFinite(value) || value <= 0) return false;
    if (value >= 1900 && value <= 2100) return false;
    if (value < 100) return false;

    const likelyYearContext = /(?:año|year|modelo|model|fabricado|fabricación|lanzamiento|release|released)/i;
    if (likelyYearContext.test(context)) return false;

    return true;
}

async function scrapeOnDemand(linkId, url, shopName, productName, sharedBrowser = null) {
    let browser = sharedBrowser;
    let page = null;
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
            console.log('🕸️ Abriendo una sola instancia de navegador para Compra Gamer...');
            if (!browser) {
                browser = await chromium.launch({
                    headless: true,
                    args: PLAYWRIGHT_BROWSER_ARGS
                });
            }

            page = await browser.newPage({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 900 }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

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
                    'span:has-text("$")',
                    '[class*="price" i]',
                    '[data-price]',
                    '[data-testid*="price" i]',
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
                const visiblePrice = await parsePriceText(bodyText);
                if (visiblePrice) {
                    precioLimpio = visiblePrice;
                }
            }
        }

        // ==========================================
        // GUARDADO EN BASE DE DATOS Y ALERTAS
        // ==========================================
        if (precioLimpio) {
            const contextoValidacion = `${productName} ${shopName} ${url} ${precioLimpio}`;
            if (!isValidPriceCandidate(precioLimpio, contextoValidacion)) {
                console.log(`🚫 Precio descartado por considerarse inválido: $${precioLimpio}`);
                return null;
            }

            console.log(`💰 ¡Precio encontrado! $${precioLimpio}. Guardando...`);
            
            const resAnterior = await pool.query(`SELECT last_price FROM product_shop_links WHERE id = $1`, [linkId]);
            const precioAnterior = resAnterior.rows[0]?.last_price;

            if (precioAnterior && Number(precioLimpio) !== Number(precioAnterior)) {
                console.log(`🚨 CAMBIO DE PRECIO DETECTADO: De $${precioAnterior} a $${precioLimpio}`);
                await enviarAlertaTelegram(productName, shopName, precioAnterior, precioLimpio, url);
            }

            await pool.query(`INSERT INTO price_history (product_shop_id, price) VALUES ($1, $2)`, [linkId, precioLimpio]);
            await pool.query(`UPDATE product_shop_links SET last_price = $1 WHERE id = $2`, [precioLimpio, linkId]);
            
            return precioLimpio;
        }

    } catch (error) {
        console.error(`❌ Error actualizando ${shopName}:`, error.message);
        return null;
    } finally {
        if (page) await page.close().catch(() => {});
        if (!sharedBrowser && browser) await browser.close().catch(() => {});
    }
}
// Función para scrapear TODOS los productos activos
// Función para scrapear TODOS los productos activos
async function scrapeAllProducts() {
    let browser = null;
    try {
        console.log('🔄 Iniciando actualización masiva de precios...');

        const { rows: links } = await pool.query(`
            SELECT psl.id, psl.product_url, s.name as shop_name, p.name as product_name
            FROM product_shop_links psl
            JOIN shops s ON psl.shop_id = s.id
            JOIN products p ON psl.product_id = p.id
            WHERE psl.is_active = true
        `);

        let actualizados = 0;

        const compraGamerLinks = links.filter(link => link.shop_name === 'Compra Gamer');
        if (compraGamerLinks.length > 0) {
            browser = await chromium.launch({
                headless: true,
                args: PLAYWRIGHT_BROWSER_ARGS
            });
        }

        const batches = [];
        for (let i = 0; i < links.length; i += MAX_CONCURRENT_SCRAPES) {
            batches.push(links.slice(i, i + MAX_CONCURRENT_SCRAPES));
        }

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(link => scrapeOnDemand(link.id, link.product_url, link.shop_name, link.product_name, browser))
            );

            actualizados += batchResults.filter(Boolean).length;
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
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// Asegurate de exportar TAMBIÉN esta nueva función
module.exports = { parsePriceText, isValidPriceCandidate, scrapeOnDemand, scrapeAllProducts };
