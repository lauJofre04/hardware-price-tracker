const test = require('node:test');
const assert = require('node:assert/strict');
const { armarMensajeAlerta, escapeHtml, formatearPrecio } = require('../src/services/telegramService');

test('escapeHtml neutraliza etiquetas y comillas', () => {
    assert.equal(escapeHtml('<b>"A" & B</b>'), '&lt;b&gt;&quot;A&quot; &amp; B&lt;/b&gt;');
});

test('formatearPrecio acepta strings (DECIMAL de pg) y números', () => {
    assert.equal(formatearPrecio('130000.00'), formatearPrecio(130000));
    assert.match(formatearPrecio('130000.00'), /^\$130[.,\s]?000$/);
});

test('el mensaje escapa el nombre del producto y la URL', () => {
    const msg = armarMensajeAlerta('SSD <script> & más', 'Compra Gamer', '150000.00', '120000', 'https://x.com/?a=1&b="2"');
    assert.ok(!msg.includes('<script>'));
    assert.ok(msg.includes('SSD &lt;script&gt; &amp; más'));
    assert.ok(msg.includes('href="https://x.com/?a=1&amp;b=&quot;2&quot;"'));
    assert.ok(msg.includes('BAJÓ'));
});

test('distingue baja de suba', () => {
    assert.ok(armarMensajeAlerta('P', 'T', '100', '200', 'https://x.com').includes('SUBIÓ'));
});
