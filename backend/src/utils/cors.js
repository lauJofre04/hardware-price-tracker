// Orígenes del frontend que pueden llamar a la API.
const ORIGENES_FIJOS = [
    'http://localhost:5173',
    'https://hardware-price-tracker-eight.vercel.app',
    'https://hardware-price-tracker.vercel.app',
    'https://hardware-price-tracker-git-main.vercel.app'
];

// Despliegues de vista previa de Vercel del proyecto, por ejemplo:
//   hardware-price-tracker-git-refactor-frontend-miequipo.vercel.app
//   hardware-price-tracker-4f9k2x1ab-miequipo.vercel.app
const RE_PREVIEW_VERCEL = /^https:\/\/hardware-price-tracker(-[a-z0-9]+)+\.vercel\.app$/;

// CORS_ORIGIN: orígenes extra separados por coma (ej: un dominio propio)
function listarOrigenes(extra = process.env.CORS_ORIGIN || '') {
    return [...ORIGENES_FIJOS, ...extra.split(',').map((o) => o.trim())].filter(Boolean);
}

function origenPermitido(origen, extra) {
    if (!origen) return true; // peticiones sin Origin (curl, health checks de Render)
    return listarOrigenes(extra).includes(origen) || RE_PREVIEW_VERCEL.test(origen);
}

module.exports = { origenPermitido, listarOrigenes, RE_PREVIEW_VERCEL };
