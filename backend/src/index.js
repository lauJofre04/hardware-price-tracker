require('dotenv').config();
const cron = require('node-cron');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ Falta JWT_SECRET (mínimo 32 caracteres) en las variables de entorno.');
    process.exit(1);
}

const pool = require('./config/db');
const { ensureDbSchema } = require('./config/schema');
const { crearApp } = require('./app');
const { scrapeAllProducts, ScrapeEnCursoError } = require('./services/scraperServices');

const PORT = process.env.PORT || 3000;

function programarCron() {
    if (process.env.ENABLE_CRON === 'false') {
        console.log('⏰ Cron desactivado (ENABLE_CRON=false).');
        return;
    }
    // 12:00 y 17:00 hora Argentina, sin depender de la zona horaria del servidor
    cron.schedule('0 12,17 * * *', async () => {
        console.log('⏰ [CRON] Iniciando actualización automática...');
        try {
            const actualizados = await scrapeAllProducts();
            console.log(`✅ [CRON] ${actualizados} productos actualizados.`);
        } catch (error) {
            if (error instanceof ScrapeEnCursoError) {
                console.log('⏭️ [CRON] Ya había una actualización en curso; se omite esta corrida.');
            } else {
                console.error('❌ [CRON] Error en la actualización automática:', error.message);
            }
        }
    }, { timezone: 'America/Argentina/Buenos_Aires' });
}

async function iniciar() {
    try {
        await ensureDbSchema(pool); // una sola vez al arrancar
        console.log('✅ Esquema de base de datos verificado.');
    } catch (error) {
        console.error('❌ No se pudo verificar la base de datos:', error.message);
        process.exit(1);
    }

    crearApp().listen(PORT, () => {
        console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
        programarCron();
    });
}

iniciar();
