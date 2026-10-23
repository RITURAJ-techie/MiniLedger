import pg from "pg";
import "dotenv/config";

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await db.connect();

  await db.query(`
    ALTER TABLE public.loans
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  `);

  const result = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'loans'
      AND column_name = 'archived_at';
  `);

  console.log("SUCCESS: Archive column exists:", result.rows);
} catch (error) {
  console.error("FAILED:", error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
