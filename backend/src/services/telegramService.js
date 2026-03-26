// Reemplazá con los datos que te dio Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN; 
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviarAlertaTelegram(productoNombre, tienda, precioAnterior, precioNuevo, url) {
    let textoMensaje = '';

    // Evaluamos si el precio bajó o subió para armar el mensaje correcto
    if (Number(precioNuevo) < Number(precioAnterior)) {
                textoMensaje = `
        📉 <b>¡BAJÓ DE PRECIO!</b> 📉

        💻 <b>Producto:</b> ${productoNombre}
        🏪 <b>Tienda:</b> ${tienda}

        ❌ Antes: $${precioAnterior.toLocaleString('es-AR')}
        ✅ <b>AHORA: $${precioNuevo.toLocaleString('es-AR')}</b>

        👉 <a href="${url}">Ver oferta en la tienda</a>
                `;
            } else {
                textoMensaje = `
        📈 <b>¡SUBIÓ DE PRECIO!</b> 📈

        💻 <b>Producto:</b> ${productoNombre}
        🏪 <b>Tienda:</b> ${tienda}

        ✅ Antes: $${precioAnterior.toLocaleString('es-AR')}
        ❌ <b>AHORA: $${precioNuevo.toLocaleString('es-AR')}</b>

        👉 <a href="${url}">Ver publicación</a>
                `;
    }

    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;

    try {
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: textoMensaje,
                parse_mode: 'HTML' 
            })
        });

        if (response.ok) {
            console.log('📱 ¡Alerta de Telegram enviada con éxito!');
        } else {
            console.error('⚠️ Telegram rechazó el mensaje:', await response.text());
        }
    } catch (error) {
        console.error('❌ Error conectando con Telegram:', error.message);
    }
}

module.exports = { enviarAlertaTelegram };