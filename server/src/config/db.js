const mysql = require('mysql2/promise');

let pool;

/**
 * Returns the singleton MySQL connection pool.
 * Creates it on first call using environment variables.
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nagoweb',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+00:00',
      // Return JS Date objects for DATETIME columns
      dateStrings: false,
    });
  }
  return pool;
}

/**
 * Test the database connection on startup.
 */
async function connectDB() {
  const db = getPool();
  const conn = await db.getConnection();
  console.log(`✅  MySQL connected → ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  conn.release();
  return db;
}

module.exports = { getPool, connectDB };
