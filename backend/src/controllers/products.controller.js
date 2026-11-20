const products = require('../repositories/products');
const shops = require('../repositories/shops');
const { scrapeOnDemand, scrapeAllProducts, ScrapeEnCursoError } = require('../services/scraperServices');
const { validarUrlProducto, parseId, textoCorto } = require('../utils/validators');

const ESPERA_MAX_SCRAPE_MS = 20000; // cuánto espera POST /api/products al primer precio

const LIMITE_POR_DEFECTO = 12;
const LIMITE_MAXIMO = 50;

// GET /api/products
//   Sin parámetros: arreglo completo (formato original, para clientes que todavía no paginan).
//   Con ?page=&limit=&q=: { items, page, limit, total, totalPages, budget }
async function listar(req, res) {
    try {
        const { page, limit, q } = req.query;
        if (page === undefined && limit === undefined && q === undefined) {
            return res.json(await products.listar());
        }

        const pagina = page === undefined ? 1 : parseId(page);
        const porPagina = limit === undefined ? LIMITE_POR_DEFECTO : parseId(limit);
        const filtro = q === undefined ? '' : textoCorto(q, { max: 100 });
        if (!pagina || !porPagina || porPagina > LIMITE_MAXIMO || filtro === null) {
            return res.status(400).json({ error: `Parámetros inválidos: page ≥ 1, limit entre 1 y ${LIMITE_MAXIMO}, q hasta 100 caracteres` });
        }

        const [resultado, budget] = await Promise.all([
            products.listarPaginado({ page: pagina, limit: porPagina, q: filtro }),
            products.presupuesto()
        ]);
        res.json({ ...resultado, budget });
    } catch (error) {
        console.error('Error al consultar productos:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener productos' });
    }
}

async function alternarSeleccion(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        const seleccionado = await products.alternarSeleccion(id);
        if (seleccionado === null) return res.status(404).json({ error: 'Producto no encontrado' });
        res.status(200).json({ message: '✅ Estado de selección actualizado', is_selected: seleccionado });
    } catch (error) {
        console.error('Error al alternar selección del producto:', error);
        res.status(500).json({ error: 'Error al intentar cambiar la selección del producto' });
    }
}

// Actualiza ÚNICAMENTE el link de un producto
async function actualizarUrl(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        const links = await products.linksDeProducto(id);
        if (links.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        const url = validarUrlProducto(req.body?.product_url, links[0].shop_name);
        if (!url) {
            return res.status(400).json({ error: `El enlace debe ser una URL https de ${links[0].shop_name}` });
        }

        await products.actualizarUrlDeLink(links[0].id, url);
        res.status(200).json({ message: '✅ Enlace actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar enlace:', error);
        res.status(500).json({ error: 'Error al intentar actualizar el producto' });
    }
}

// Historial de precios de un PRODUCTO (el gráfico del frontend pasa product_id)
async function historial(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        res.json(await products.historial(id));
    } catch (error) {
        console.error('Error al consultar historial:', error);
        res.status(500).json({ error: 'Error interno al obtener el historial' });
    }
}

// Agrega un producto y trata de scrapearlo al instante
async function crear(req, res) {
    const body = req.body || {};
    const name = textoCorto(body.name, { min: 1, max: 255 });
    const category = body.category ? textoCorto(body.category, { max: 100 }) : '';
    const brand = body.brand ? textoCorto(body.brand, { max: 100 }) : '';
    const shopId = parseId(body.shop_id);

    if (!name || category === null || brand === null || !shopId) {
        return res.status(400).json({ error: 'Datos inválidos: revisá nombre, categoría, marca y tienda' });
    }

    try {
        const shop = await shops.buscarPorId(shopId);
        if (!shop) return res.status(400).json({ error: 'La tienda indicada no existe' });

        const productUrl = validarUrlProducto(body.product_url, shop.name);
        if (!productUrl) {
            return res.status(400).json({ error: `El enlace debe ser una URL https de ${shop.name}` });
        }

        const linkId = await products.crearConLink({
            name,
            category: category || null,
            brand: brand || null,
            shopId,
            url: productUrl
        });

        // Espera el primer precio como máximo ESPERA_MAX_SCRAPE_MS. Si tarda más, responde igual
        // y el scrapeo termina en segundo plano (scrapeOnDemand nunca lanza: captura sus errores).
        const price = await Promise.race([
            scrapeOnDemand(linkId, productUrl, shop.name, name),
            new Promise((resolve) => setTimeout(() => resolve(undefined), ESPERA_MAX_SCRAPE_MS).unref())
        ]);

        res.status(201).json({
            message: price === undefined
                ? '✅ Producto agregado. El precio se está buscando y aparecerá en unos instantes.'
                : '✅ Producto agregado y scrapeado',
            price: price ?? null
        });
    } catch (error) {
        console.error('Error al guardar producto:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
}

async function eliminar(req, res) {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        if (!(await products.eliminar(id))) return res.status(404).json({ error: 'Producto no encontrado' });
        res.status(200).json({ message: '✅ Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al intentar eliminar el producto' });
    }
}

async function scrapearTodos(req, res) {
    try {
        const actualizados = await scrapeAllProducts();
        res.status(200).json({ message: `Scraping masivo completado. ${actualizados} precios actualizados.` });
    } catch (error) {
        if (error instanceof ScrapeEnCursoError) {
            return res.status(409).json({ error: 'Ya hay una actualización en curso. Esperá a que termine.' });
        }
        console.error('Error en el endpoint de scrape-all:', error);
        res.status(500).json({ error: 'Error al ejecutar la actualización masiva' });
    }
}

module.exports = { listar, alternarSeleccion, actualizarUrl, historial, crear, eliminar, scrapearTodos };
