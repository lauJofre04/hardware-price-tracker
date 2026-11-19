const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePriceText, isValidPriceCandidate } = require('../src/services/priceParser');

const casos = [
    ['precio con año y precio real', 'Año 2017. Precio $130.000', 130000],
    ['precio con coma decimal', 'Precio final $1.299,99', 1299.99],
    ['precio sin símbolo de moneda', 'Oferta 3499', 3499],
    ['año aislado', 'Fabricado en 2017', null],
    ['oferta que es en realidad un año', 'Oferta $ 2017', null],
    ['año y precio en el mismo texto', 'Año 2017 y producto con precio $ 499.999', 499999],
    ['Compra Gamer: mejor precio, no el mayor número', 'Mejor precio $ 519.990 Incluye 10% de descuento. Precio s/imp. nac. $ 470.579', 519990],
    ['no elige el número más grande', 'Precio $ 150.000 Envío gratis. Producto vendido: 9.999.999 unidades', 150000],
    ['espacios no separables', 'Precio $ 130.000', 130000],
    ['texto vacío', '', null],
    ['sin precio', 'Producto sin stock', null]
];

for (const [nombre, texto, esperado] of casos) {
    test(`parsePriceText: ${nombre}`, () => {
        assert.equal(parsePriceText(texto), esperado);
    });
}

test('isValidPriceCandidate rechaza años, valores chicos y no numéricos', () => {
    assert.equal(isValidPriceCandidate(2017), false);
    assert.equal(isValidPriceCandidate(50), false);
    assert.equal(isValidPriceCandidate(NaN), false);
    assert.equal(isValidPriceCandidate(130000), true);
});
