require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const pool = require('../config/db');

async function cleanupInvalidPrices() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const clearedLinks = await client.query(`
      UPDATE product_shop_links
      SET last_price = NULL
      WHERE last_price IS NOT NULL
        AND CAST(last_price AS NUMERIC) = 2017
      RETURNING id;
    `);

    const clearedHistory = await client.query(`
      DELETE FROM price_history
      WHERE CAST(price AS NUMERIC) = 2017
      RETURNING product_shop_id;
    `);

    await client.query('COMMIT');

    console.log(`✅ Registros corregidos: ${clearedLinks.rowCount} links y ${clearedHistory.rowCount} histórico.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al limpiar precios inválidos:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupInvalidPrices().catch((error) => {
  process.exitCode = 1;
});
