const test = require('node:test');
const assert = require('node:assert/strict');
const { origenPermitido } = require('../src/utils/cors');

test('permite los orígenes fijos y las peticiones sin Origin', () => {
    assert.ok(origenPermitido('http://localhost:5173', ''));
    assert.ok(origenPermitido('https://hardware-price-tracker.vercel.app', ''));
    assert.ok(origenPermitido(undefined, ''));
});

test('permite las vistas previas de Vercel del proyecto', () => {
    assert.ok(origenPermitido('https://hardware-price-tracker-git-refactor-frontend-laujofre04s-projects.vercel.app', ''));
    assert.ok(origenPermitido('https://hardware-price-tracker-4f9k2x1ab-laujofre04s-projects.vercel.app', ''));
});

test('rechaza dominios ajenos o parecidos', () => {
    for (const o of [
        'https://evil.com',
        'https://hardware-price-tracker.evil.com',
        'https://hardware-price-trackerx.vercel.app',
        'https://otro-hardware-price-tracker-x.vercel.app',
        'http://hardware-price-tracker-git-x.vercel.app',
        'https://hardware-price-tracker-x.vercel.app.evil.com'
    ]) {
        assert.equal(origenPermitido(o, ''), false, o);
    }
});

test('CORS_ORIGIN agrega orígenes extra', () => {
    assert.ok(origenPermitido('https://mi-dominio.com', 'https://otro.com, https://mi-dominio.com'));
    assert.equal(origenPermitido('https://mi-dominio.com', ''), false);
});
