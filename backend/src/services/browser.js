const { chromium } = require('playwright');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// --no-sandbox es necesario en contenedores sin user namespaces (Render, Docker).
// Es una excepción consciente: el navegador solo visita las tiendas de la lista blanca.
const PLAYWRIGHT_BROWSER_ARGS = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'
];

function lanzarNavegador() {
    return chromium.launch({ headless: true, args: PLAYWRIGHT_BROWSER_ARGS });
}

module.exports = { USER_AGENT, PLAYWRIGHT_BROWSER_ARGS, lanzarNavegador };
