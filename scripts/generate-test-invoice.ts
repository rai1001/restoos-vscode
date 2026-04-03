/**
 * Genera una factura española realista como imagen PNG
 * para testing de CLARA OCR.
 *
 * Usage: npx tsx scripts/generate-test-invoice.ts
 * Output: scripts/fixtures/factura-test.png
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(__dirname, 'fixtures');
const OUTPUT_FILE = join(OUTPUT_DIR, 'factura-test.png');

const INVOICE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #fff; color: #222; width: 800px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #1a3a5c; padding-bottom: 20px; }
  .logo { font-size: 24px; font-weight: bold; color: #1a3a5c; }
  .logo small { display: block; font-size: 12px; color: #666; font-weight: normal; }
  .factura-badge { background: #1a3a5c; color: #fff; padding: 8px 20px; font-size: 20px; font-weight: bold; height: fit-content; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 25px; }
  .party { width: 48%; }
  .party h3 { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 5px; letter-spacing: 1px; }
  .party p { font-size: 13px; line-height: 1.6; }
  .meta { display: flex; gap: 40px; margin-bottom: 25px; padding: 12px 16px; background: #f5f7fa; border-radius: 4px; }
  .meta-item { font-size: 13px; }
  .meta-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a3a5c; color: #fff; padding: 10px 12px; font-size: 12px; text-align: left; text-transform: uppercase; }
  thead th:nth-child(n+3) { text-align: right; }
  tbody td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e8e8e8; }
  tbody td:nth-child(n+3) { text-align: right; }
  tbody tr:nth-child(even) { background: #fafbfc; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 280px; }
  .totals-table tr td { padding: 6px 12px; font-size: 13px; }
  .totals-table tr td:last-child { text-align: right; }
  .totals-table .total-row { border-top: 2px solid #1a3a5c; font-size: 16px; font-weight: bold; color: #1a3a5c; }
  .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">
    Pescados y Mariscos Galicia S.L.
    <small>Distribuidor mayorista de productos del mar</small>
    <small>Lonxa de Vigo, Nave 14 - 36202 Vigo (Pontevedra)</small>
  </div>
  <div class="factura-badge">FACTURA</div>
</div>

<div class="parties">
  <div class="party">
    <h3>Datos del emisor</h3>
    <p>
      <strong>Pescados y Mariscos Galicia S.L.</strong><br>
      NIF: B36985214<br>
      Lonxa de Vigo, Nave 14<br>
      36202 Vigo (Pontevedra)<br>
      Tel: 986 123 456<br>
      info@pescadosgalicia.es
    </p>
  </div>
  <div class="party">
    <h3>Datos del cliente</h3>
    <p>
      <strong>Hotel Eurostars A Coruna</strong><br>
      NIF: B15000001<br>
      Avda. Puerto, 2<br>
      15001 A Coruna<br>
      Tel: 981 654 321
    </p>
  </div>
</div>

<div class="meta">
  <div class="meta-item">
    <strong>N. Factura</strong>
    PMG-2026-0347
  </div>
  <div class="meta-item">
    <strong>Fecha factura</strong>
    01/04/2026
  </div>
  <div class="meta-item">
    <strong>Fecha vencimiento</strong>
    01/05/2026
  </div>
  <div class="meta-item">
    <strong>Forma de pago</strong>
    Transferencia 30 dias
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Descripcion</th>
      <th>Uds</th>
      <th>Cantidad</th>
      <th>Precio/ud</th>
      <th>IVA</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Merluza fresca del pincho (lomos)</td>
      <td>kg</td>
      <td>12,500</td>
      <td>18,50 EUR</td>
      <td>10%</td>
      <td>231,25 EUR</td>
    </tr>
    <tr>
      <td>Gambas rojas de Huelva (grande)</td>
      <td>kg</td>
      <td>6,000</td>
      <td>42,00 EUR</td>
      <td>10%</td>
      <td>252,00 EUR</td>
    </tr>
    <tr>
      <td>Pulpo fresco gallego (pieza entera)</td>
      <td>kg</td>
      <td>8,200</td>
      <td>22,80 EUR</td>
      <td>10%</td>
      <td>186,96 EUR</td>
    </tr>
    <tr>
      <td>Navajas de Carril (bandeja 1kg)</td>
      <td>ud</td>
      <td>4,000</td>
      <td>35,00 EUR</td>
      <td>10%</td>
      <td>140,00 EUR</td>
    </tr>
    <tr>
      <td>Rape limpio (cola sin espina)</td>
      <td>kg</td>
      <td>5,500</td>
      <td>28,90 EUR</td>
      <td>10%</td>
      <td>158,95 EUR</td>
    </tr>
    <tr>
      <td>Almejas finas de Carril</td>
      <td>kg</td>
      <td>3,000</td>
      <td>55,00 EUR</td>
      <td>10%</td>
      <td>165,00 EUR</td>
    </tr>
    <tr>
      <td>Transporte refrigerado Vigo-A Coruna</td>
      <td>ud</td>
      <td>1,000</td>
      <td>45,00 EUR</td>
      <td>21%</td>
      <td>45,00 EUR</td>
    </tr>
  </tbody>
</table>

<div class="totals">
  <table class="totals-table">
    <tr>
      <td>Base imponible (IVA 10%)</td>
      <td>1.134,16 EUR</td>
    </tr>
    <tr>
      <td>IVA 10%</td>
      <td>113,42 EUR</td>
    </tr>
    <tr>
      <td>Base imponible (IVA 21%)</td>
      <td>45,00 EUR</td>
    </tr>
    <tr>
      <td>IVA 21%</td>
      <td>9,45 EUR</td>
    </tr>
    <tr class="total-row">
      <td>TOTAL FACTURA</td>
      <td>1.302,03 EUR</td>
    </tr>
  </table>
</div>

<div class="footer">
  <p>IBAN: ES12 2080 5678 9012 3456 7890 | Registro Mercantil de Pontevedra, Tomo 4521, Folio 128, Hoja PO-54321</p>
  <p>Esta factura esta sujeta a la Ley 37/1992 del Impuesto sobre el Valor Anadido</p>
</div>

</body>
</html>`;

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Generando factura de prueba...');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
  await page.setContent(INVOICE_HTML, { waitUntil: 'load' });
  await page.screenshot({ path: OUTPUT_FILE, fullPage: true });
  await browser.close();

  console.log(`Factura generada: ${OUTPUT_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
