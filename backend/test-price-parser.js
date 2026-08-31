const { parsePriceText } = require('./src/services/scraperServices');

(async () => {
  const cases = [
    ['precio con año y precio real', 'Año 2017. Precio $130.000', 130000],
    ['precio normal con punto', 'Precio final $1.299,99', 1299.99],
    ['precio normal sin moneda', 'Oferta 3499', 3499],
    ['año aislado', 'Fabricado en 2017', null]
  ];

  let failed = false;

  for (const [label, text, expected] of cases) {
    const actual = await parsePriceText(text);
    if (actual !== expected) {
      console.error(`FAIL: ${label} | expected=${expected} actual=${actual}`);
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log('All parsePriceText tests passed');
})();
