// Run from a trusted machine with database egress. Values come only from environment.
// Default: counts/schema only. --apply-family-schema changes ONLY existing Neon.
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { neonDatabaseUrl } from "../server/database-config.js";
import { familyReadiness } from "../server/family-readiness.js";
const apply = process.argv.includes("--apply-family-schema");
const targets = [["Neon", neonDatabaseUrl()]];
if (!apply && process.env.SUPABASE_MIGRATION_DATABASE_URL)
  targets.push(["Supabase", process.env.SUPABASE_MIGRATION_DATABASE_URL]);
for (const [provider, connectionString] of targets) {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  });
  try {
    if (apply) {
      if (process.env.CONFIRM_NEON_FAMILY_MIGRATION !== "yes")
        throw new Error("backup_confirmation_required");
      const migration = await readFile(
        new URL("../migrations/20261107_family_settings.sql", import.meta.url),
        "utf8",
      );
      await pool.query(migration);
      console.log(
        JSON.stringify({
          provider,
          appliedFamilySchema: true,
          readiness: await familyReadiness(pool),
        }),
      );
    } else {
      await pool.query("BEGIN READ ONLY");
      const { rows } = await pool.query(
        "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('public','auth') AND table_type='BASE TABLE' ORDER BY 1,2",
      );
      const tables = [];
      for (const row of rows) {
        const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
        const columns = await pool.query(
          "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position",
          [row.table_schema, row.table_name],
        );
        const count = await pool.query(
          `SELECT count(*)::text AS count FROM ${quote(row.table_schema)}.${quote(row.table_name)}`,
        );
        tables.push({
          schema: row.table_schema,
          table: row.table_name,
          count: count.rows[0].count,
          columns: columns.rows,
        });
      }
      console.log(JSON.stringify({ provider, tables }));
      await pool.query("ROLLBACK");
    }
  } catch (error) {
    // Connection errors can contain passwords/hosts: never print message or stack.
    console.error(
      JSON.stringify({
        provider,
        success: false,
        code: error.code || "check_connection_and_backup_confirmation",
      }),
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
