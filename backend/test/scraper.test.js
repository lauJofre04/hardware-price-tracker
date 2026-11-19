// Prueba de scrapeOnDemand con la base y la red simuladas (no necesita Postgres ni internet).
const test = require('node:test');
const assert = require('node:assert/strict');

const consultas = [];
let precioAnteriorEnBd = null;
let linkExiste = true;

const cliente = {
    query: async (sql, params) => {
        consultas.push([sql.trim().split(/\s+/).slice(0, 3).join(' '), params]);
        if (/SELECT last_price/.test(sql)) return { rows: linkExiste ? [{ last_price: precioAnteriorEnBd }] : [] };
        return { rows: [] };
    },
    release: () => {}
};
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { connect: async () => cliente, query: async () => ({ rows: [] }) } };

process.env.TELEGRAM_TOKEN = 'token-de-prueba';
process.env.TELEGRAM_CHAT_ID = '1';

const mensajesTelegram = [];
const fetchOriginal = global.fetch;
let htmlTienda = '';
const URL_ML = 'https://articulo.mercadolibre.com.ar/MLA-1';
let urlFinal = URL_ML;

global.fetch = async (url, opts) => {
    if (String(url).startsWith('https://api.telegram.org/')) {
        mensajesTelegram.push(JSON.parse(opts.body).text);
        return { ok: true, text: async () => '' };
    }
    return { ok: true, status: 200, url: urlFinal, text: async () => htmlTienda };
};
test.after(() => { global.fetch = fetchOriginal; });

const { scrapeOnDemand, extraerPrecioMercadoLibre, debeAlertar } = require('../src/services/scraperServices');

const html = (precio) => `<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":${precio}}}</script>`;

function reset(anterior) {
    consultas.length = 0;
    mensajesTelegram.length = 0;
    precioAnteriorEnBd = anterior;
    linkExiste = true;
    urlFinal = URL_ML;
}

test('extraerPrecioMercadoLibre prefiere JSON-LD y respeta decimales', () => {
    assert.equal(extraerPrecioMercadoLibre(html('129999.5')), 129999.5);
    assert.equal(extraerPrecioMercadoLibre('<meta itemprop="price" content="1299.99">'), 1299.99);
    assert.equal(extraerPrecioMercadoLibre('<p>Precio $ 5.000</p>'), null, 'ya no se busca un "$" suelto en el HTML');
});

test('guarda en transacción y alerta una baja DESPUÉS del commit', async () => {
    reset('150000.00');
    htmlTienda = html(120000);
    const precio = await scrapeOnDemand(5, URL_ML, 'Mercado Libre', 'Teclado <X>');
    assert.equal(precio, 120000);
    assert.deepEqual(consultas.map((c) => c[0]), ['BEGIN', 'SELECT last_price FROM', 'INSERT INTO price_history', 'UPDATE product_shop_links SET', 'COMMIT']);
    assert.equal(mensajesTelegram.length, 1);
    assert.ok(mensajesTelegram[0].includes('Teclado &lt;X&gt;'));
});

test('no alerta si el precio sube (por defecto) ni si no cambia', async () => {
    reset('100000.00');
    htmlTienda = html(120000);
    assert.equal(await scrapeOnDemand(5, URL_ML, 'Mercado Libre', 'P'), 120000);
    assert.equal(mensajesTelegram.length, 0);

    reset('120000.00');
    assert.equal(await scrapeOnDemand(5, URL_ML, 'Mercado Libre', 'P'), 120000);
    assert.equal(mensajesTelegram.length, 0);
});

test('debeAlertar respeta ALERT_ON_PRICE_INCREASE', () => {
    assert.equal(debeAlertar(null, 100), false);
    assert.equal(debeAlertar('200', '100'), true);
    assert.equal(debeAlertar('100', '200'), false);
    process.env.ALERT_ON_PRICE_INCREASE = 'true';
    assert.equal(debeAlertar('100', '200'), true);
    delete process.env.ALERT_ON_PRICE_INCREASE;
});

test('rechaza URLs fuera de la lista blanca sin hacer ninguna consulta', async () => {
    reset(null);
    assert.equal(await scrapeOnDemand(5, 'http://169.254.169.254/', 'Mercado Libre', 'P'), null);
    assert.equal(consultas.length, 0);
});

test('rechaza una redirección a otro dominio', async () => {
    reset(null);
    htmlTienda = html(120000);
    urlFinal = 'https://evil.example.com/';
    assert.equal(await scrapeOnDemand(5, URL_ML, 'Mercado Libre', 'P'), null);
    assert.equal(consultas.length, 0);
});

test('descarta precios inválidos (año) sin guardarlos', async () => {
    reset(null);
    htmlTienda = html(2017);
    assert.equal(await scrapeOnDemand(5, URL_ML, 'Mercado Libre', 'P'), null);
    assert.equal(consultas.length, 0);
});

test('si el link fue borrado, hace rollback y no devuelve precio', async () => {
    reset(null);
    linkExiste = false;
    htmlTienda = html(120000);
    assert.equal(await scrapeOnDemand(5, URL_ML, 'Mercado Libre', 'P'), null);
    assert.equal(consultas.at(-1)[0], 'ROLLBACK');
});
