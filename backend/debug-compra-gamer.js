const { chromium } = require('playwright');
const { parsePriceText, isValidPriceCandidate } = require('./src/services/scraperServices');

(async () => {
  const url = 'https://compragamer.com/producto/Placa_de_Video_Asrock_Radeon_RX_7600_8GB_GDDR6_Challenger_OC_14722?sort=lower_price&cate=62';
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 1200 }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    const bodyText = await page.locator('body').innerText();
    console.log('BODY_HAS_PRICE', /\$\s*\d/.test(bodyText));
    const parsed = await parsePriceText(bodyText);
    console.log('PARSED', parsed);
    console.log('VALID', isValidPriceCandidate(parsed, 'Compra Gamer prueba'));
  } finally {
    await browser.close();
  }
})();
