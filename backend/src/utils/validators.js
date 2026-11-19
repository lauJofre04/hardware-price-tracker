// Validaciones de entrada compartidas por las rutas y el scraper.

// Dominios permitidos por tienda. Es la defensa contra SSRF: el servidor hace
// fetch()/Playwright sobre estas URLs, así que NO puede aceptar cualquier host.
const HOSTS_PERMITIDOS = {
    'Mercado Libre': ['mercadolibre.com.ar', 'mercadolibre.com'],
    'Compra Gamer': ['compragamer.com']
};

function hostPermitido(hostname, tienda) {
    const dominios = HOSTS_PERMITIDOS[tienda];
    if (!dominios) return false;
    const host = hostname.toLowerCase();
    return dominios.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Devuelve la URL normalizada si es https y pertenece a la tienda indicada,
 * o null si no es válida.
 */
function validarUrlProducto(valor, tienda) {
    if (typeof valor !== 'string' || valor.length > 2048) return null;
    let url;
    try {
        url = new URL(valor.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== '443') return null;
    if (!hostPermitido(url.hostname, tienda)) return null;
    return url.toString();
}

// Convierte un parámetro de ruta/body en entero positivo, o null.
function parseId(valor) {
    const n = typeof valor === 'number' ? valor : Number(valor);
    return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// String recortado con largo máximo. Devuelve null si no cumple.
function textoCorto(valor, { min = 0, max = 255 } = {}) {
    if (typeof valor !== 'string') return null;
    const t = valor.trim();
    return t.length >= min && t.length <= max ? t : null;
}

module.exports = { validarUrlProducto, hostPermitido, parseId, textoCorto, HOSTS_PERMITIDOS };
