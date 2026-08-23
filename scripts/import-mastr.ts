import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { requirePool } from "@/lib/db";

interface MastrRow {
  municipalityCode: string;
  installations: number;
  capacityKwp: number;
  dataAsOf: string;
}

async function main() {
  const file = argument("--file");
  if (!file) throw new Error("Usage: pnpm import:mastr -- --file path/to/municipality-aggregates.csv");
  const content = await readFile(file, "utf8");
  const checksum = createHash("sha256").update(content).digest("hex");
  const rows = parseCsv(content);
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const source = await client.query("SELECT id FROM data_sources WHERE key = 'mastr'");
    if (!source.rowCount) throw new Error("Run db:seed before importing MaStR aggregates");
    for (const row of rows) {
      await client.query(
        `INSERT INTO regional_solar_stats (region_id, source_id, source_version, installations, installed_capacity_kwp, data_as_of)
         SELECT r.id, $1, $2, $3, $4, $5::timestamptz FROM regions r WHERE r.municipality_code = $6
         ON CONFLICT (region_id, source_id, source_version) DO UPDATE SET installations = EXCLUDED.installations,
           installed_capacity_kwp = EXCLUDED.installed_capacity_kwp, data_as_of = EXCLUDED.data_as_of`,
        [source.rows[0].id, checksum.slice(0, 16), row.installations, row.capacityKwp, row.dataAsOf, row.municipalityCode]
      );
    }
    await client.query("COMMIT");
    console.log(`Imported ${rows.length} municipality aggregates from MaStR`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function parseCsv(content: string): MastrRow[] {
  const lines = content.trim().split(/\r?\n/);
  const header = lines.shift()?.split(",").map((value) => value.trim()) ?? [];
  const required = ["municipality_code", "installations", "installed_capacity_kwp", "data_as_of"];
  if (!required.every((column) => header.includes(column))) throw new Error(`CSV must contain ${required.join(", ")}`);
  return lines.filter(Boolean).map((line, index) => {
    const values = line.split(",").map((value) => value.trim());
    const read = (name: string) => values[header.indexOf(name)];
    const row = {
      municipalityCode: read("municipality_code"),
      installations: Number(read("installations")),
      capacityKwp: Number(read("installed_capacity_kwp")),
      dataAsOf: read("data_as_of")
    };
    if (!row.municipalityCode || !Number.isFinite(row.installations) || !Number.isFinite(row.capacityKwp) || !row.dataAsOf) {
      throw new Error(`Invalid CSV row ${index + 2}`);
    }
    return row;
  });
}

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
