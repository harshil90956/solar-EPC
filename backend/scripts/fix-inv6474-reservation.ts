/**
 * Fix: INV6474 has reserved:100 on item but no reservation document.
 * This creates the missing reservation document for Manoj Patel P5062.
 * Run: npx ts-node --project tsconfig.json scripts/fix-inv6474-reservation.ts
 */
import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const conn = await mongoose.connect(mongoUri);
  const db = conn.connection.db!;

  // Get the item to find its tenantId
  const item = await db.collection('items').findOne({ itemId: 'INV6474', warehouse: 'Ahmedabad Warehouse' });
  if (!item) {
    console.log('Item INV6474 not found');
    await mongoose.disconnect();
    return;
  }
  console.log(`Found item: ${item.itemId}, reserved: ${item.reserved}, tenantId: ${item.tenantId}`);

  // Check if reservation already exists
  const existing = await db.collection('inventoryreservations').findOne({
    itemId: 'INV6474',
    projectId: 'P5062',
    status: 'active'
  });

  if (existing) {
    console.log('Reservation already exists:', existing._id);
    await mongoose.disconnect();
    return;
  }

  // Create reservation document matching the reserved qty on item
  const reservation = {
    reservationId: `RES-${Date.now()}`,
    itemId: 'INV6474',
    projectId: 'P5062',
    quantity: 100,
    status: 'active',
    notes: 'Reservation restored from item reserved field',
    tenantId: new mongoose.Types.ObjectId(item.tenantId.toString()),
    reservedDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection('inventoryreservations').insertOne(reservation);
  console.log(`✅ Created reservation: ${result.insertedId}`);
  console.log(`   itemId: INV6474, projectId: P5062, qty: 100, status: active`);

  await mongoose.disconnect();
  console.log('Done!');
}

fix().catch(err => { console.error(err); process.exit(1); });
