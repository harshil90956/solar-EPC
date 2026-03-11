/**
 * Diagnostic: check what's in DB for INV6474 reservations
 * Run: npx ts-node --project tsconfig.json scripts/check-reservation-inv6474.ts
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const conn = await mongoose.connect(mongoUri);
  const db = conn.connection.db!;

  // Check items with INV6474
  const items = await db.collection('items').find({ itemId: 'INV6474' }).toArray();
  console.log('\n=== ITEMS (INV6474) ===');
  items.forEach(i => console.log(`  _id: ${i._id}, warehouse: ${i.warehouse}, stock: ${i.stock}, reserved: ${i.reserved}`));

  // Check ALL reservations for this item (any format)
  const variants = ['INV6474', '6474', 'INV6474'.replace(/^INV/, '')];
  const reservations = await db.collection('inventoryreservations').find({
    itemId: { $in: variants }
  }).toArray();
  console.log(`\n=== RESERVATIONS (itemId in ${JSON.stringify(variants)}) ===`);
  if (reservations.length === 0) {
    console.log('  NONE FOUND');
  } else {
    reservations.forEach(r => console.log(`  _id: ${r._id}, itemId: ${r.itemId}, projectId: ${r.projectId}, qty: ${r.quantity}, status: ${r.status}, tenantId: ${r.tenantId}`));
  }

  // Also dump ALL reservations to see what's there
  const allRes = await db.collection('inventoryreservations').find({}).toArray();
  console.log(`\n=== ALL RESERVATIONS (total: ${allRes.length}) ===`);
  allRes.forEach(r => console.log(`  itemId: "${r.itemId}", projectId: ${r.projectId}, qty: ${r.quantity}, status: ${r.status}`));

  await mongoose.disconnect();
}

check().catch(err => { console.error(err); process.exit(1); });
