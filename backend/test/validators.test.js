const test = require('node:test');
const assert = require('node:assert/strict');
const { validarUrlProducto, parseId, textoCorto } = require('../src/utils/validators');

test('acepta URLs https de la tienda correcta', () => {
    assert.ok(validarUrlProducto('https://articulo.mercadolibre.com.ar/MLA-123-teclado', 'Mercado Libre'));
    assert.ok(validarUrlProducto('https://compragamer.com/producto/Placa_14722?sort=lower_price', 'Compra Gamer'));
    assert.ok(validarUrlProducto('https://www.compragamer.com/armatupc', 'Compra Gamer'));
});

test('rechaza hosts internos o ajenos (SSRF)', () => {
    for (const url of [
        'http://localhost:3000/api/products',
        'https://127.0.0.1/',
        'http://169.254.169.254/latest/meta-data/',
        'https://evil.com/mercadolibre.com.ar',
        'https://mercadolibre.com.ar.evil.com/',
        'https://evilmercadolibre.com.ar/',
        'https://user:pass@mercadolibre.com.ar/',
        'https://mercadolibre.com.ar:8443/',
        'file:///etc/passwd',
        'javascript:alert(1)'
    ]) {
        assert.equal(validarUrlProducto(url, 'Mercado Libre'), null, url);
    }
});

test('rechaza http y URL de otra tienda', () => {
    assert.equal(validarUrlProducto('http://www.mercadolibre.com.ar/x', 'Mercado Libre'), null);
    assert.equal(validarUrlProducto('https://compragamer.com/x', 'Mercado Libre'), null);
    assert.equal(validarUrlProducto('https://compragamer.com/x', 'Tienda Desconocida'), null);
});

test('rechaza valores que no son string o son demasiado largos', () => {
    assert.equal(validarUrlProducto(undefined, 'Mercado Libre'), null);
    assert.equal(validarUrlProducto({ $ne: '' }, 'Mercado Libre'), null);
    assert.equal(validarUrlProducto('https://mercadolibre.com.ar/' + 'a'.repeat(3000), 'Mercado Libre'), null);
});

test('parseId acepta solo enteros positivos', () => {
    assert.equal(parseId('42'), 42);
    assert.equal(parseId(7), 7);
    for (const malo of ['0', '-1', '1.5', 'abc', '', null, undefined, '1; DROP TABLE x']) {
        assert.equal(parseId(malo), null, String(malo));
    }
});

test('textoCorto recorta y valida largo', () => {
    assert.equal(textoCorto('  hola  ', { min: 1, max: 10 }), 'hola');
    assert.equal(textoCorto('', { min: 1 }), null);
    assert.equal(textoCorto('x'.repeat(300), { max: 255 }), null);
    assert.equal(textoCorto(123), null);
});
