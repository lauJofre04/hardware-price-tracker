const pool = require('../config/db');
const { lanzarNavegador, USER_AGENT } = require('./browser');
const { enviarAlertaTelegram, enviarResumenPresupuesto } = require('./telegramService');
const { parsePriceText, isValidPriceCandidate } = require('./priceParser');
const { validarUrlProducto, hostPermitido } = require('../utils/validators');

const MAX_CONCURRENT_SCRAPES = 2;
const FETCH_TIMEOUT_MS = 15000;

class ScrapeEnCursoError extends Error {
    constructor() {
        super('Ya hay una actualización masiva en curso');
        this.name = 'ScrapeEnCursoError';
    }
}

let scrapeMasivoEnCurso = false;

// ==========================================
// Extracción de precio desde el HTML de Mercado Libre
// ==========================================
function precioDeJsonLd(html) {
    const bloques = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const [, contenido] of bloques) {
        let datos;
        try {
            datos = JSON.parse(contenido);
        } catch {
            continue;
        }
        const nodos = Array.isArray(datos) ? datos : datos['@graph'] ? datos['@graph'] : [datos];
        for (const nodo of nodos) {
            const oferta = Array.isArray(nodo?.offers) ? nodo.offers[0] : nodo?.offers;
            const valor = Number(oferta?.price ?? oferta?.lowPrice);
            if (Number.isFinite(valor) && valor > 0) return valor;
        }
    }
    return null;
}

// Orden: datos estructurados (JSON-LD / meta itemprop) primero; los patrones genéricos
// sobre el JSON embebido quedan como último recurso. Ya no se busca un "$" en todo el HTML.
function extraerPrecioMercadoLibre(html) {
    const estructurado = precioDeJsonLd(html);
    if (estructurado) return estructurado;

    const patrones = [
        /<meta\s+itemprop=["']price["']\s+content=["'](\d+(?:\.\d+)?)["']/i,
        /<meta\s+content=["'](\d+(?:\.\d+)?)["']\s+itemprop=["']price["']/i,
        /"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/i,
        /"priceValue"\s*:\s*"?(\d+(?:\.\d+)?)"?/i
    ];

    for (const patron of patrones) {
        const match = html.match(patron);
        if (match) {
            // El valor ya viene con punto decimal (ej: 129999.5): NO se le quitan los puntos.
            const numero = Number(match[1]);
            if (Number.isFinite(numero) && numero > 0) return numero;
        }
    }
    return null;
}

async function precioMercadoLibre(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3'
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (!response.ok) throw new Error(`Mercado Libre respondió HTTP ${response.status}`);

    // Si hubo redirecciones, el destino final también tiene que ser de la tienda.
    if (!hostPermitido(new URL(response.url).hostname, 'Mercado Libre')) {
        throw new Error('Redirección a un dominio no permitido');
    }

    return extraerPrecioMercadoLibre(await response.text());
}

// ==========================================
// Extracción de precio en Compra Gamer (Playwright)
// ==========================================
async function precioCompraGamer(url, browser) {
    const page = await browser.newPage({
        userAgent: USER_AGENT,
        viewport: { width: 1280, height: 900 }
    });

    try {
        page.setDefaultTimeout(20000);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        try {
            await page.waitForFunction(() => {
                const text = document.body ? document.body.innerText : '';
                return /Mejor precio|Otros medios de pago|\$\s*\d/.test(text);
            }, { timeout: 15000 });
        } catch {
            console.log('⏳ Compra Gamer no mostró precio visible a tiempo; se parsea el body actual.');
        }

        if (url.includes('/armatupc')) {
            const bodyText = await page.locator('body').innerText();
            const totalMatch = bodyText.match(/Total:\s*\$?\s*([0-9.]\d{0,3}(?:\.\d{3})*(?:,\d{2})?)/i);
            if (totalMatch && totalMatch[1]) {
                const total = Number(totalMatch[1].replace(/\./g, '').replace(',', '.'));
                if (Number.isFinite(total) && total > 0) return total;
            }
        }

        const selectores = ['span:has-text("$")', '[class*="price" i]', '[data-price]', '[data-testid*="price" i]', 'body'];
        for (const selector of selectores) {
            try {
                const el = page.locator(selector).first();
                if ((await el.count()) === 0) continue;
                const parsed = parsePriceText(await el.innerText());
                if (parsed) return parsed;
            } catch {
                // sigue con el siguiente selector
            }
        }

        return parsePriceText(await page.locator('body').innerText());
    } finally {
        await page.close().catch(() => {});
    }
}

// ==========================================
// Guardado + alerta
// ==========================================
// Guarda historial y último precio en una transacción. Devuelve el precio anterior
// (o undefined si el link ya no existe). La alerta se envía DESPUÉS del commit.
async function guardarPrecio(linkId, precio) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query(
            'SELECT last_price FROM product_shop_links WHERE id = $1 FOR UPDATE',
            [linkId]
        );
        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return { guardado: false };
        }
        await client.query('INSERT INTO price_history (product_shop_id, price) VALUES ($1, $2)', [linkId, precio]);
        await client.query('UPDATE product_shop_links SET last_price = $1 WHERE id = $2', [precio, linkId]);
        await client.query('COMMIT');
        return { guardado: true, anterior: rows[0].last_price };
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

function debeAlertar(anterior, nuevo) {
    if (anterior == null) return false;
    const a = Number(anterior);
    const n = Number(nuevo);
    if (a === n) return false;
    // Por defecto solo avisa las bajas. ALERT_ON_PRICE_INCREASE=true avisa también las subas.
    return n < a || process.env.ALERT_ON_PRICE_INCREASE === 'true';
}

async function scrapeOnDemand(linkId, url, shopName, productName, sharedBrowser = null) {
    let browser = sharedBrowser;
    try {
        const urlSegura = validarUrlProducto(url, shopName);
        if (!urlSegura) {
            console.error(`🚫 URL no permitida para ${shopName} (link ${linkId}); se omite.`);
            return null;
        }

        console.log(`\n🤖 Actualizando "${productName}" en ${shopName}...`);
        let precio = null;

        if (shopName === 'Mercado Libre') {
            precio = await precioMercadoLibre(urlSegura);
        } else if (shopName === 'Compra Gamer') {
            if (!browser) browser = await lanzarNavegador();
            precio = await precioCompraGamer(urlSegura, browser);
        } else {
            console.error(`🚫 Tienda sin scraper: ${shopName}`);
            return null;
        }

        if (!precio) {
            console.log('⚠️ No se encontró precio.');
            return null;
        }
        if (!isValidPriceCandidate(precio)) {
            console.log(`🚫 Precio descartado por inválido: $${precio}`);
            return null;
        }

        const { guardado, anterior } = await guardarPrecio(linkId, precio);
        if (!guardado) return null;

        console.log(`💰 Precio guardado: $${precio}`);
        if (debeAlertar(anterior, precio)) {
            console.log(`🚨 Cambio de precio: de $${anterior} a $${precio}`);
            await enviarAlertaTelegram(productName, shopName, anterior, precio, urlSegura);
        }

        return precio;
    } catch (error) {
        console.error(`❌ Error actualizando ${shopName}:`, error.message);
        return null;
    } finally {
        if (!sharedBrowser && browser) await browser.close().catch(() => {});
    }
}

// Scrapea TODOS los productos activos. Solo una corrida a la vez.
async function scrapeAllProducts() {
    if (scrapeMasivoEnCurso) throw new ScrapeEnCursoError();
    scrapeMasivoEnCurso = true;

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

        if (links.some((l) => l.shop_name === 'Compra Gamer')) {
            browser = await lanzarNavegador();
        }

        let actualizados = 0;
        for (let i = 0; i < links.length; i += MAX_CONCURRENT_SCRAPES) {
            const lote = links.slice(i, i + MAX_CONCURRENT_SCRAPES);
            const resultados = await Promise.all(
                lote.map((l) => scrapeOnDemand(l.id, l.product_url, l.shop_name, l.product_name, browser))
            );
            actualizados += resultados.filter(Boolean).length;
        }

        const { rows: [resumen] } = await pool.query(`
            SELECT COALESCE(SUM(psl.last_price), 0) AS total_presupuesto, COUNT(*) AS cantidad_productos
            FROM product_shop_links psl
            JOIN products p ON psl.product_id = p.id
            WHERE psl.is_active = true AND p.is_selected = true
        `);

        await enviarResumenPresupuesto(Number(resumen?.total_presupuesto || 0), Number(resumen?.cantidad_productos || 0));

        console.log(`✅ Actualización masiva terminada. ${actualizados}/${links.length} exitosos.`);
        return actualizados;
    } catch (error) {
        console.error('❌ Error en el scraping masivo:', error.message);
        throw error;
    } finally {
        scrapeMasivoEnCurso = false;
        if (browser) await browser.close().catch(() => {});
    }
}

module.exports = {
    scrapeOnDemand,
    scrapeAllProducts,
    ScrapeEnCursoError,
    extraerPrecioMercadoLibre,
    debeAlertar,
    // Compatibilidad con scripts existentes
    parsePriceText,
    isValidPriceCandidate
};
