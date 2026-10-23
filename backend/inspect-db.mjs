import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://miniledger:miniledger_dev_password@localhost:5433/miniledger",
});

try {
  const tables = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename",
    ["public"]
  );

  console.table(tables.rows);

  const history = await pool.query(
    "SELECT to_regclass($1) AS migration_table",
    ["public.__drizzle_migrations"]
  );

  console.log("Drizzle migration history:", history.rows);
} catch (error) {
  console.error(error.message);
} finally {
  await pool.end();
}
