const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { noEncontrado, manejarErrores } = require('./middleware/errorHandler');
const { origenPermitido } = require('./utils/cors');

// Arma la aplicación Express (sin escuchar en ningún puerto: eso lo hace index.js)
function crearApp() {
    const app = express();
    app.set('trust proxy', 1); // detrás de un proxy (Render), para que req.ip sea la IP real

    app.use(cors({
        origin: (origin, callback) => {
            if (origenPermitido(origin)) return callback(null, true);
            // Se rechaza sin lanzar error y se registra el origen para poder agregarlo a CORS_ORIGIN si es legítimo.
            console.warn(`🚫 CORS: origen no permitido: ${origin}`);
            callback(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));
    app.use(express.json({ limit: '100kb' }));

    app.use('/api', routes);
    app.use(noEncontrado);
    app.use(manejarErrores);

    return app;
}

module.exports = { crearApp };
