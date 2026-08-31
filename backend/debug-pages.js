const { chromium } = require('playwright');

const queries = [
  'Mother ASUS ProArt B650-Creator AM5 DDR5',
  'Memoria Team DDR4 3200MHz Vulcan ASUS TUF Alliance CL16',
  'SSD Disco Sólido Team 1TB T-Force Vulcan Z 550MB/s',
  'Placa de Video Asrock Radeon RX 7600 8GB GDDR6 Challenger OC'
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1200 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  for (const q of queries) {
    const url = 'https://compragamer.com/?s=' + encodeURIComponent(q);
    console.log('\n=== QUERY: ' + q + ' ===');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const productLinks = await page.$$eval('a[href*="/producto/"]', els =>
      els.slice(0, 8).map(el => ({ href: el.href, text: el.innerText.trim().slice(0, 140) }))
    );
    console.log(JSON.stringify(productLinks, null, 2));
  }

  await browser.close();
})();
