import pg from 'pg';

const client = new pg.Client({
  host: '127.0.0.1', port: 54322,
  user: 'postgres', password: 'postgres', database: 'postgres',
});

try {
  await client.connect();
  // Delete all 5eed0000 prefixed records in FK order
  const tables = [
    'goods_receipt_lines', 'goods_receipts',
    'purchase_order_lines', 'purchase_orders',
    'check_records', 'check_templates',
    'sales_data', 'staff_shifts', 'staff_members',
    'reservations', 'recipe_ingredients', 'recipes',
    'product_aliases', 'supplier_offers', 'products', 'suppliers'
  ];
  for (const t of tables) {
    const r = await client.query(`DELETE FROM ${t} WHERE id::text LIKE '5eed0000%'`);
    if (r.rowCount > 0) console.log(`  ${t}: deleted ${r.rowCount}`);
  }
  console.log('Clean done');
} catch (e) {
  console.error(e.message);
} finally {
  await client.end();
}
