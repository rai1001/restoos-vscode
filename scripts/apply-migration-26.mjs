import pg from 'pg';
import fs from 'fs';

const client = new pg.Client({
  host: '127.0.0.1',
  port: 54322,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

try {
  await client.connect();
  console.log('Connected to local Supabase postgres');

  // Check current state
  const existing = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND tablename IN ('staff_members','staff_shifts','sales_data')
    ORDER BY tablename
  `);

  if (existing.rows.length === 3) {
    console.log('All M26 tables already exist. Nothing to do.');
    await client.end();
    process.exit(0);
  }

  // Drop old reservations (M1 version) and product_aliases (M3 version) to replace with M26
  console.log('Dropping old table versions...');
  await client.query('DROP TABLE IF EXISTS product_aliases CASCADE');
  await client.query('DROP TABLE IF EXISTS reservations CASCADE');
  await client.query('DROP TABLE IF EXISTS staff_shifts CASCADE');
  await client.query('DROP TABLE IF EXISTS staff_members CASCADE');
  await client.query('DROP TABLE IF EXISTS sales_data CASCADE');

  // Also drop indexes that might conflict
  await client.query('DROP INDEX IF EXISTS idx_reservations_hotel_date');
  await client.query('DROP INDEX IF EXISTS idx_reservations_status');
  await client.query('DROP INDEX IF EXISTS idx_reservations_client');

  // Now apply the full migration
  const sql = fs.readFileSync('supabase/migrations/00000000000026_reservations_staffing_sales_aliases.sql', 'utf-8');
  await client.query(sql);
  console.log('Migration 26 applied!');

  // Verify
  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND tablename IN ('reservations','staff_members','staff_shifts','sales_data','product_aliases')
    ORDER BY tablename
  `);
  console.log('Tables created:', tables.rows.map(r => r.tablename).join(', '));

  // Verify columns on reservations
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='reservations' AND table_schema='public'
    ORDER BY ordinal_position
  `);
  console.log('Reservations columns:', cols.rows.map(r => r.column_name).join(', '));

  // Reload PostgREST schema cache
  await client.query('NOTIFY pgrst, \'reload schema\'');
  console.log('PostgREST schema cache reloaded');

} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
} finally {
  await client.end();
}
