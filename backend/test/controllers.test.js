// Prueba los controladores con repositorios y scraper simulados: no necesita Express, Postgres ni red.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// bcrypt y jsonwebtoken simulados para que el test sea determinista
const cargaOriginal = Module._load;
Module._load = function (request, ...resto) {
    if (request === 'bcrypt') return { compare: async (plano, hash) => hash === `hash:${plano}` };
    if (request === 'jsonwebtoken') return { sign: (payload) => `token-de-${payload.username}` };
    return cargaOriginal.call(this, request, ...resto);
};

function simular(ruta, exportaciones) {
    const resuelta = require.resolve(ruta);
    require.cache[resuelta] = { id: resuelta, filename: resuelta, loaded: true, exports: exportaciones };
}

const llamadas = [];
const estado = { usuario: null, tienda: { name: 'Mercado Libre' }, links: [], existe: true, seleccion: true, precio: 120000 };

simular('../src/repositories/users', { buscarPorUsername: async () => estado.usuario });
simular('../src/repositories/shops', { listar: async () => [], buscarPorId: async () => estado.tienda });
simular('../src/repositories/products', {
    listar: async () => [],
    alternarSeleccion: async () => (estado.existe ? estado.seleccion : null),
    linksDeProducto: async () => estado.links,
    actualizarUrlDeLink: async (...a) => llamadas.push(['actualizarUrlDeLink', ...a]),
    historial: async (id) => (llamadas.push(['historial', id]), []),
    crearConLink: async (d) => (llamadas.push(['crearConLink', d]), 77),
    eliminar: async () => estado.existe
});
class ScrapeEnCursoError extends Error {}
const scraper = {
    scrapeOnDemand: async () => estado.precio,
    scrapeAllProducts: async () => { throw new ScrapeEnCursoError(); },
    ScrapeEnCursoError
};
simular('../src/services/scraperServices', scraper);
simular('../src/services/mlSearch', { buscarEnMercadoLibre: async () => null });

process.env.JWT_SECRET = 'x'.repeat(40);
const auth = require('../src/controllers/auth.controller');
const productos = require('../src/controllers/products.controller');
const search = require('../src/controllers/search.controller');

const crearRes = () => ({
    code: 200,
    body: null,
    status(c) { this.code = c; return this; },
    json(b) { this.body = b; return this; }
});

const URL_ML = 'https://articulo.mercadolibre.com.ar/MLA-1-teclado';
const valido = { name: 'Teclado', category: 'Periférico', brand: 'Aula', shop_id: '1', product_url: URL_ML };

test.beforeEach(() => {
    llamadas.length = 0;
    Object.assign(estado, { usuario: null, tienda: { name: 'Mercado Libre' }, links: [], existe: true, seleccion: true, precio: 120000 });
});

// ---------- login ----------
test('login: rechaza cuerpos que no son strings (inyección de operadores)', async () => {
    const res = crearRes();
    await auth.login({ body: { username: { $ne: '' }, password: 'x' } }, res);
    assert.equal(res.code, 400);
});

test('login: usuario inexistente y contraseña incorrecta dan el mismo mensaje', async () => {
    const a = crearRes();
    await auth.login({ body: { username: 'nadie', password: 'x' } }, a);

    estado.usuario = { id: 1, username: 'admin', password: 'hash:correcta' };
    const b = crearRes();
    await auth.login({ body: { username: 'admin', password: 'mala' } }, b);

    assert.equal(a.code, 401);
    assert.equal(b.code, 401);
    assert.deepEqual(a.body, b.body);
});

test('login: con credenciales correctas devuelve el token', async () => {
    estado.usuario = { id: 1, username: 'admin', password: 'hash:correcta' };
    const res = crearRes();
    await auth.login({ body: { username: 'admin', password: 'correcta' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.token, 'token-de-admin');
});

// ---------- crear ----------
test('crear: datos inválidos devuelven 400 sin tocar la base', async () => {
    for (const body of [{}, { ...valido, name: '' }, { ...valido, shop_id: 'abc' }, { ...valido, brand: 'x'.repeat(101) }]) {
        const res = crearRes();
        await productos.crear({ body }, res);
        assert.equal(res.code, 400, JSON.stringify(body));
    }
    assert.equal(llamadas.length, 0);
});

test('crear: tienda inexistente y URL de otra tienda devuelven 400', async () => {
    estado.tienda = null;
    const sinTienda = crearRes();
    await productos.crear({ body: valido }, sinTienda);
    assert.equal(sinTienda.code, 400);

    estado.tienda = { name: 'Mercado Libre' };
    const ajena = crearRes();
    await productos.crear({ body: { ...valido, product_url: 'http://169.254.169.254/' } }, ajena);
    assert.equal(ajena.code, 400);
    assert.equal(llamadas.length, 0);
});

test('crear: guarda y devuelve 201 con el precio', async () => {
    const res = crearRes();
    await productos.crear({ body: valido }, res);
    assert.equal(res.code, 201);
    assert.equal(res.body.price, 120000);
    assert.equal(llamadas[0][0], 'crearConLink');
    assert.equal(llamadas[0][1].shopId, 1);
});

test('crear: si todavía no hay precio responde 201 con price null', async () => {
    estado.precio = null;
    const res = crearRes();
    await productos.crear({ body: valido }, res);
    assert.equal(res.code, 201);
    assert.equal(res.body.price, null);
});

// ---------- actualizar URL ----------
test('actualizarUrl: 400 con id inválido, 404 sin producto, 400 con URL ajena, 200 con URL válida', async () => {
    const r1 = crearRes();
    await productos.actualizarUrl({ params: { id: 'x' }, body: {} }, r1);
    assert.equal(r1.code, 400);

    const r2 = crearRes();
    await productos.actualizarUrl({ params: { id: '3' }, body: { product_url: URL_ML } }, r2);
    assert.equal(r2.code, 404);

    estado.links = [{ id: 9, shop_name: 'Mercado Libre' }];
    const r3 = crearRes();
    await productos.actualizarUrl({ params: { id: '3' }, body: { product_url: 'https://evil.com/' } }, r3);
    assert.equal(r3.code, 400);

    const r4 = crearRes();
    await productos.actualizarUrl({ params: { id: '3' }, body: { product_url: URL_ML } }, r4);
    assert.equal(r4.code, 200);
    assert.deepEqual(llamadas.at(-1), ['actualizarUrlDeLink', 9, URL_ML]);
});

// ---------- eliminar / selección / historial ----------
test('eliminar y alternarSeleccion: 404 si no existe, 400 con id inválido', async () => {
    estado.existe = false;
    const a = crearRes();
    await productos.eliminar({ params: { id: '5' } }, a);
    assert.equal(a.code, 404);
    const b = crearRes();
    await productos.alternarSeleccion({ params: { id: '5' } }, b);
    assert.equal(b.code, 404);

    const c = crearRes();
    await productos.eliminar({ params: { id: '0' } }, c);
    assert.equal(c.code, 400);

    estado.existe = true;
    const d = crearRes();
    await productos.eliminar({ params: { id: '5' } }, d);
    assert.equal(d.code, 200);
});

test('historial: usa el id del producto', async () => {
    const res = crearRes();
    await productos.historial({ params: { id: '12' } }, res);
    assert.deepEqual(llamadas[0], ['historial', 12]);
    const mala = crearRes();
    await productos.historial({ params: { id: '1;DROP' } }, mala);
    assert.equal(mala.code, 400);
});

// ---------- scrape-all / búsqueda ----------
test('scrapearTodos: 409 si ya hay una actualización en curso', async () => {
    const res = crearRes();
    await productos.scrapearTodos({}, res);
    assert.equal(res.code, 409);
});

test('buscarEnML: valida la consulta y responde found:false sin resultados', async () => {
    const corta = crearRes();
    await search.buscarEnML({ query: { q: 'a' } }, corta);
    assert.equal(corta.code, 400);

    const arreglo = crearRes();
    await search.buscarEnML({ query: { q: ['a', 'b'] } }, arreglo);
    assert.equal(arreglo.code, 400);

    const ok = crearRes();
    await search.buscarEnML({ query: { q: 'teclado aula' } }, ok);
    assert.equal(ok.code, 200);
    assert.equal(ok.body.found, false);
});
