const { lanzarNavegador, USER_AGENT } = require('./browser');

// Busca en Mercado Libre y devuelve el primer resultado (o null).
async function buscarEnMercadoLibre(consulta) {
    let browser;
    try {
        browser = await lanzarNavegador();
        const page = await browser.newPage({ userAgent: USER_AGENT });
        page.setDefaultTimeout(20000);

        // "Aula F75" -> "Aula-F75" (formato de URL de listado de ML), codificado para que
        // el texto del usuario no pueda alterar la ruta ni agregar parámetros.
        const slug = encodeURIComponent(consulta.trim().replace(/\s+/g, '-'));
        await page.goto(`https://listado.mercadolibre.com.ar/${slug}`, { waitUntil: 'domcontentloaded' });

        const tarjeta = await page.$('.ui-search-layout__item');
        if (!tarjeta) return null;

        const producto = await tarjeta.evaluate((el) => {
            const nodoTitulo = el.querySelector('h2, h3, .poly-component__title, .ui-search-item__title');
            const nodoEnlaceTitulo = el.querySelector('a.ui-search-link');
            const title =
                (nodoTitulo && nodoTitulo.innerText && nodoTitulo.innerText.trim()) ||
                (nodoEnlaceTitulo && nodoEnlaceTitulo.innerText && nodoEnlaceTitulo.innerText.trim()) ||
                'Sin título';

            const nodoEnlace = el.querySelector('a');
            const link = nodoEnlace && nodoEnlace.href ? nodoEnlace.href : '';

            // Precio real: ignora tachados (precio anterior) y cuotas
            let price = 0;
            for (const frac of el.querySelectorAll('.andes-money-amount__fraction')) {
                if (frac.closest('s') || frac.closest('[class*="strikethrough"]')) continue;
                if (frac.closest('[class*="installment"]')) continue;
                price = parseInt(frac.innerText.replace(/\./g, ''), 10) || 0;
                break;
            }

            // ML carga las imágenes en diferido: si el src es un placeholder, usa data-src
            const img = el.querySelector('img');
            let thumbnail = img ? img.getAttribute('src') || '' : '';
            if (img && thumbnail.includes('data:image')) thumbnail = img.getAttribute('data-src') || thumbnail;

            return { title, link, price, thumbnail };
        });

        return producto;
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

module.exports = { buscarEnMercadoLibre };
