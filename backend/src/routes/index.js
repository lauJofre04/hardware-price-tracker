const { Router } = require('express');
const verificarToken = require('../middleware/auth');
const { crearLimitador } = require('../middleware/rateLimit');
const auth = require('../controllers/auth.controller');
const health = require('../controllers/health.controller');
const shops = require('../controllers/shops.controller');
const products = require('../controllers/products.controller');
const search = require('../controllers/search.controller');

const limitarLogin = crearLimitador({
    ventanaMs: 15 * 60 * 1000,
    maximo: 10,
    mensaje: 'Demasiados intentos. Probá de nuevo en unos minutos.'
});
const limitarBusquedas = crearLimitador({
    ventanaMs: 10 * 60 * 1000,
    maximo: 20,
    mensaje: 'Demasiadas búsquedas. Esperá unos minutos.'
});

const router = Router();

// Públicas
router.get('/health', health.health);
router.post('/auth/login', limitarLogin, auth.login);
router.get('/shops', shops.listar);
router.get('/products', products.listar);
router.get('/products/:id/history', products.historial);

// Requieren token de administrador
router.post('/products', verificarToken, products.crear);
router.put('/products/:id', verificarToken, products.actualizarUrl);
router.put('/products/:id/toggle-selection', verificarToken, products.alternarSeleccion);
router.delete('/products/:id', verificarToken, products.eliminar);
router.post('/scrape-all', verificarToken, products.scrapearTodos);
router.get('/search/ml', verificarToken, limitarBusquedas, search.buscarEnML);

module.exports = router;
