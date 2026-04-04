/**
 * Seed script — loads demo data for Grupo Culuca (4 locales).
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires: Supabase running locally (npx supabase start)
 */
import { execSync } from "child_process";
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEMO_USER = {
  id: "cc000000-0000-0000-0000-000000000001",
  email: "chisco@culuca.com",
  password: "culuca2026",
};

function run(cmd: string) {
  console.log(`→ ${cmd.slice(0, 80)}...`);
  execSync(cmd, { stdio: "inherit" });
}

async function createDemoUser() {
  console.log("\n1/4  Creando usuario demo...");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      email_confirm: true,
    }),
  });

  if (res.ok || res.status === 422) {
    console.log("   ✓ Usuario demo listo (o ya existía)");
  } else {
    console.error(`   ✗ Error creando usuario: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
}

function loadSeeds() {
  const container = "supabase_db_chefos";
  const seeds = ["culuca_demo.sql", "chisco_multilocal.sql", "appcc_templates.sql"];

  seeds.forEach((file, i) => {
    console.log(`\n${i + 2}/4  Cargando ${file}...`);
    run(`docker exec -i ${container} psql -U postgres -d postgres < supabase/seeds/${file}`);
  });
}

function createMembership() {
  console.log("\n5/5  Creando membership...");
  const sql = `INSERT INTO memberships (user_id, hotel_id, tenant_id, role, is_active, is_default) VALUES ('${DEMO_USER.id}','bb000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','direction',true,true) ON CONFLICT DO NOTHING;`;
  run(`docker exec supabase_db_chefos psql -U postgres -d postgres -c "${sql}"`);
}

async function main() {
  console.log("🔧 RestoOS — Seed de datos demo (Grupo Culuca)\n");

  if (!SERVICE_ROLE_KEY || !ANON_KEY) {
    console.error("Faltan SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
    process.exit(1);
  }

  await createDemoUser();
  loadSeeds();
  createMembership();

  console.log("\n✅ Seed completo. Login: chisco@culuca.com / culuca2026\n");
}

main();
