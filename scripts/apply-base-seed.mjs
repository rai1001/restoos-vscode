import pg from 'pg';
import fs from 'fs';

const client = new pg.Client({
  host: '127.0.0.1', port: 54322,
  user: 'postgres', password: 'postgres', database: 'postgres',
});

try {
  await client.connect();

  const check = await client.query("SELECT id FROM tenants WHERE id='aa000000-0000-0000-0000-000000000001'");
  if (check.rows.length > 0) {
    console.log('Base seed already exists.');
    await client.end();
    process.exit(0);
  }

  const sql = fs.readFileSync('supabase/seeds/culuca_demo.sql', 'utf-8');

  // Execute the whole file as one query
  await client.query(sql);
  console.log('Base seed applied!');

  const counts = await client.query(`
    SELECT 'tenants' as t, count(*) as c FROM tenants
    UNION ALL SELECT 'hotels', count(*) FROM hotels
    UNION ALL SELECT 'suppliers', count(*) FROM suppliers
    UNION ALL SELECT 'products', count(*) FROM products
    UNION ALL SELECT 'recipes', count(*) FROM recipes
    ORDER BY t
  `);
  for (const row of counts.rows) console.log(`  ${row.t}: ${row.c}`);

  await client.query("NOTIFY pgrst, 'reload schema'");
  await new Promise(r => setTimeout(r, 2000));
  console.log('Ready');

} catch (e) {
  console.error('Error:', e.message);
} finally {
  await client.end();
}
