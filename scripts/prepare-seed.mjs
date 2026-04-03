import pg from 'pg';

const client = new pg.Client({
  host: '127.0.0.1', port: 54322,
  user: 'postgres', password: 'postgres', database: 'postgres',
});

try {
  await client.connect();

  // Make checked_by nullable for seeding (no auth.users in dev)
  await client.query('ALTER TABLE check_records ALTER COLUMN checked_by DROP NOT NULL');
  console.log('check_records.checked_by now nullable');

  // Reload PostgREST cache
  await client.query("NOTIFY pgrst, 'reload schema'");
  console.log('Schema cache reloaded');

  // Wait a moment for PostgREST to reload
  await new Promise(r => setTimeout(r, 2000));
  console.log('Ready for seeding');
} catch (e) {
  console.error(e.message);
} finally {
  await client.end();
}
