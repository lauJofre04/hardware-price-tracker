// Parseo de precios a partir de texto. Sin dependencias, para poder testearlo aislado.

const PALABRAS_DINERO = '(?:\\$|ARS|AR\\$|ARG|precio|oferta|ahora|total|subtotal|desde|por|mejor precio|cuotas|s\\/imp|final)';
const RE_DINERO = new RegExp(PALABRAS_DINERO, 'i');
const RE_RECHAZO = /(?:sku|\bid\b|modelo|model|año|year|fabricado|fabricación|lanzamiento|release|released|capacidad|stock|cantidad)/i;
const RE_CONTEXTO_ANIO = /(?:año|year|modelo|model|fabricado|fabricación|lanzamiento|release|released)/i;

function isLikelyYear(value, context = '') {
    if (value < 1900 || value > 2100) return false;
    if (RE_CONTEXTO_ANIO.test(context)) return true;
    return !RE_DINERO.test(context) && String(value).length === 4;
}

function parseNumericValue(raw) {
    if (!raw) return null;

    const cleaned = raw
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .replace(/[^0-9.]/g, '');

    if (!cleaned) return null;

    const value = Number(cleaned);
    return Number.isFinite(value) && value > 0 ? value : null;
}

// Patrones ordenados de MÁS a MENOS confiables. Se usa el primer valor válido del
// primer patrón que encuentre algo (antes se elegía el número más grande del texto,
// lo que podía devolver cualquier cifra ajena al precio, como un total o un código).
const PATRONES = [
    /\b(?:precio|oferta|ahora|total|subtotal|desde|por|mejor precio|cuotas|s\/imp|final)\D{0,30}(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?/gi,
    /\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?/gi,
    /(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?\s*(?:ARS|AR\$|ARG)/gi,
    /\b(\d{1,3}(?:\.\d{3})+|\d+)\b/g
];

function parsePriceText(texto) {
    if (!texto) return null;

    const normalized = String(texto)
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    for (const patron of PATRONES) {
        patron.lastIndex = 0;
        for (const match of normalized.matchAll(patron)) {
            const raw = match[0];
            const value = parseNumericValue(raw);
            if (value == null) continue;
            if (value < 100) continue;
            if (value >= 1900 && value <= 2100) continue;

            const inicio = match.index;
            const context = normalized.slice(
                Math.max(0, inicio - 60),
                Math.min(normalized.length, inicio + raw.length + 60)
            );
            if (isLikelyYear(value, context)) continue;

            const tieneDinero = RE_DINERO.test(context);
            const tieneRechazo = RE_RECHAZO.test(context);

            if (!tieneDinero && value < 1000) continue;
            if (!tieneDinero && tieneRechazo) continue;

            return value;
        }
    }

    return null;
}

// Validación numérica final antes de guardar. El contexto textual ya se evaluó al parsear;
// antes se re-validaba con nombre de producto + URL, y un "modelo" en el nombre descartaba precios reales.
function isValidPriceCandidate(value) {
    if (!Number.isFinite(value)) return false;
    if (value < 100) return false;
    if (value >= 1900 && value <= 2100) return false;
    return true;
}

module.exports = { parsePriceText, parseNumericValue, isLikelyYear, isValidPriceCandidate };
