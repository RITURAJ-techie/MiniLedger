import pg from "pg";

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await db.connect();

  const tables = await db.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name IN (
      'loans',
      'refresh_tokens',
      '__drizzle_migrations'
    )
    ORDER BY table_schema, table_name
  `);

  console.log("TABLES:", tables.rows);

  const columns = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'loans'
    ORDER BY ordinal_position
  `);

  console.log("LOAN COLUMNS:", columns.rows);

  const history = await db.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name = '__drizzle_migrations'
  `);

  for (const row of history.rows) {
    const result = await db.query(
      `SELECT * FROM "${row.table_schema}"."__drizzle_migrations" ORDER BY created_at`
    );
    console.log("MIGRATION HISTORY:", result.rows);
  }
} catch (error) {
  console.error(error.message);
} finally {
  await db.end();
}
