import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({
    connectionString,
  });

  await client.connect();
  console.log("Connected to database for project pdf columns migration");

  // Add pdf_url and pdf_name columns to project table if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project' AND column_name = 'pdf_url'
      ) THEN
        ALTER TABLE "project" ADD COLUMN "pdf_url" text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project' AND column_name = 'pdf_name'
      ) THEN
        ALTER TABLE "project" ADD COLUMN "pdf_name" text;
      END IF;
    END $$;
  `);

  console.log("Migration executed successfully: project.pdf_url and project.pdf_name are verified.");

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'project' AND column_name IN ('pdf_url', 'pdf_name')
    ORDER BY column_name;
  `);
  console.log("Verified columns in project table:", res.rows);

  await client.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
