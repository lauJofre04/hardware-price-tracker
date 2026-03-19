const bcrypt = require('bcrypt');
const pool = require('./src/config/db'); // Fijate que esta ruta apunte bien a tu archivo de DB

async function generarAdmin() {
    try {
        // 1. Creamos la tabla
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        `);

        // 2. Encriptamos la contraseña
        const passwordHasheada = await bcrypt.hash('admin123', 10);

        // 3. Insertamos el usuario
        await pool.query(
            `INSERT INTO users (username, password) VALUES ($1, $2)`, 
            ['admin', passwordHasheada]
        );

        console.log('✅ Usuario administrador creado con éxito.');
    } catch (error) {
        console.error('❌ Error al crear el admin:', error.message);
    } finally {
        pool.end();
    }
}

generarAdmin();