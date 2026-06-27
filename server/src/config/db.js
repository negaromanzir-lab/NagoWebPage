const { Pool } = require('pg');

let pool;

/**
 * Returns the singleton PostgreSQL connection pool.
 * Uses DATABASE_URL (Neon connection string) from environment.
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

/**
 * pg pool wraps query differently from mysql2:
 *   mysql2 → db.query(sql, params)  returns [rows, fields]
 *   pg      → db.query(sql, params)  returns { rows, rowCount }
 *
 * This helper normalises it to return [rows] so the rest of the
 * codebase can use the same destructuring pattern it already uses.
 *
 *   const [rows] = await db.query(sql, params);
 *   const [[row]] = await db.query(sql, params);  // single row
 */
function createCompatiblePool(pgPool) {
  return {
    query: async (sql, params = []) => {
      const result = await pgPool.query(sql, params);
      return [result.rows, result.fields];
    },
    // Expose the raw pg pool for transactions if needed
    _pool: pgPool,
  };
}

/**
 * Test the database connection on startup.
 */
async function connectDB() {
  const pgPool = getPool();
  const client = await pgPool.connect();
  const { rows } = await client.query('SELECT current_database() AS db, version()');
  console.log(`✅  PostgreSQL connected → ${rows[0].db}`);
  client.release();
  return createCompatiblePool(pgPool);
}

// Export a proxy so all callers do: const db = getPool()
// and db.query() works with the [rows] destructuring pattern.
let compatiblePool;
function getCompatiblePool() {
  if (!compatiblePool) {
    compatiblePool = createCompatiblePool(getPool());
  }
  return compatiblePool;
}

module.exports = { getPool: getCompatiblePool, connectDB };
