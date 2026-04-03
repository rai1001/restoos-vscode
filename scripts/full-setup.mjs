import pg from 'pg';
import fs from 'fs';
import path from 'path';

const client = new pg.Client({
  host: '127.0.0.1', port: 54322,
  user: 'postgres', password: 'postgres', database: 'postgres',
});

try {
  await client.connect();
  console.log('Connected to Supabase postgres');

  // Get all migration files in order
  const migDir = 'supabase/migrations';
  const files = fs.readdirSync(migDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migrations`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migDir, file), 'utf-8');
    try {
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    } catch (e) {
      // Some may already be applied, that's ok with IF NOT EXISTS
      if (e.message.includes('already exists')) {
        console.log(`  ~ ${file} (already applied)`);
      } else {
        console.log(`  ✗ ${file}: ${e.message.split('\n')[0]}`);
      }
    }
  }

  // Make checked_by nullable for dev seeding
  await client.query('ALTER TABLE check_records ALTER COLUMN checked_by DROP NOT NULL').catch(() => {});

  // Apply base seed
  console.log('\nApplying culuca_demo.sql seed...');
  const seedSql = fs.readFileSync('supabase/seeds/culuca_demo.sql', 'utf-8');
  try {
    await client.query(seedSql);
    console.log('  ✓ Base seed applied');
  } catch (e) {
    console.log(`  ✗ Seed error: ${e.message.split('\n')[0]}`);
  }

  // Verify
  const tables = await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `);
  console.log(`\n${tables.rows.length} tables in public schema`);

  const counts = await client.query(`
    SELECT 'tenants' as t, count(*) as c FROM tenants
    UNION ALL SELECT 'hotels', count(*) FROM hotels
    UNION ALL SELECT 'suppliers', count(*) FROM suppliers
    UNION ALL SELECT 'products', count(*) FROM products
    UNION ALL SELECT 'recipes', count(*) FROM recipes
  `);
  for (const row of counts.rows) {
    console.log(`  ${row.t}: ${row.c}`);
  }

  // Reload PostgREST
  await client.query("NOTIFY pgrst, 'reload schema'");
  console.log('\nPostgREST cache reloaded. Ready for synthetic seed.');

} catch (e) {
  console.error('Fatal:', e.message);
} finally {
  await client.end();
}
