const TOKEN = () => process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID;

// parse_mode HTML: hay que escapar el texto dinámico (nombres de producto, URLs).
function escapeHtml(valor) {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// pg devuelve DECIMAL como string: se convierte siempre a Number antes de formatear.
function formatearPrecio(valor) {
    return `$${Number(valor).toLocaleString('es-AR')}`;
}

async function enviarMensaje(texto) {
    const token = TOKEN();
    const chatId = CHAT_ID();
    if (!token || !chatId) {
        console.warn('⚠️ Telegram no configurado (TELEGRAM_TOKEN / TELEGRAM_CHAT_ID); se omite el aviso.');
        return false;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML' }),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.error('⚠️ Telegram rechazó el mensaje:', await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('❌ Error conectando con Telegram:', error.message);
        return false;
    }
}

function armarMensajeAlerta(productoNombre, tienda, precioAnterior, precioNuevo, url) {
    const bajo = Number(precioNuevo) < Number(precioAnterior);
    const titulo = bajo ? '📉 <b>¡BAJÓ DE PRECIO!</b> 📉' : '📈 <b>¡SUBIÓ DE PRECIO!</b> 📈';
    const enlace = bajo ? 'Ver oferta en la tienda' : 'Ver publicación';

    return [
        titulo,
        '',
        `💻 <b>Producto:</b> ${escapeHtml(productoNombre)}`,
        `🏪 <b>Tienda:</b> ${escapeHtml(tienda)}`,
        '',
        `Antes: ${formatearPrecio(precioAnterior)}`,
        `<b>AHORA: ${formatearPrecio(precioNuevo)}</b>`,
        '',
        `👉 <a href="${escapeHtml(url)}">${enlace}</a>`
    ].join('\n');
}

async function enviarAlertaTelegram(productoNombre, tienda, precioAnterior, precioNuevo, url) {
    const ok = await enviarMensaje(armarMensajeAlerta(productoNombre, tienda, precioAnterior, precioNuevo, url));
    if (ok) console.log('📱 ¡Alerta de Telegram enviada con éxito!');
}

async function enviarResumenPresupuesto(total, cantidadProductos) {
    const ok = await enviarMensaje(
        `🛒 Resumen de tu presupuesto: ${cantidadProductos} componentes seleccionados por un total de ${formatearPrecio(total)}`
    );
    if (ok) console.log('📱 Resumen de presupuesto enviado con éxito');
}

module.exports = { enviarAlertaTelegram, enviarResumenPresupuesto, armarMensajeAlerta, escapeHtml, formatearPrecio };
