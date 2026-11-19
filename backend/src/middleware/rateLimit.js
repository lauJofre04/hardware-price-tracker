// Limitador simple en memoria (una sola instancia). Frena fuerza bruta y abuso de endpoints costosos.
function crearLimitador({ ventanaMs, maximo, mensaje }) {
    const registros = new Map();

    const limpiador = setInterval(() => {
        const ahora = Date.now();
        for (const [clave, reg] of registros) if (reg.reset <= ahora) registros.delete(clave);
    }, ventanaMs);
    limpiador.unref();

    return (req, res, next) => {
        const ahora = Date.now();
        let reg = registros.get(req.ip);
        if (!reg || reg.reset <= ahora) {
            reg = { count: 0, reset: ahora + ventanaMs };
            registros.set(req.ip, reg);
        }
        reg.count++;
        if (reg.count > maximo) {
            res.set('Retry-After', String(Math.ceil((reg.reset - ahora) / 1000)));
            return res.status(429).json({ error: mensaje });
        }
        next();
    };
}

module.exports = { crearLimitador };
