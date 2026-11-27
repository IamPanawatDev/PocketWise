import postgres from "postgres";

async function run() {
  const sql = postgres("postgresql://postgres:postgres@localhost:5432/pocketwise_db");
  const cats = await sql`SELECT * FROM "Categories" LIMIT 3`;
  console.log("Sample categories:", cats);
  await sql.end();
}

run();
