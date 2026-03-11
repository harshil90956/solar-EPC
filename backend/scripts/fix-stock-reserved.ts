/**
 * Script to restore correct stock values.
 * Old code did: stock -= quantity AND reserved += quantity on stock-out.
 * New code only does: reserved += quantity (stock stays unchanged).
 * So items with reserved > 0 have stock that was incorrectly reduced.
 * Fix: stock = stock + reserved  (restore what was deducted)
 * Run with: npx ts-node --project tsconfig.json scripts/fix-stock-reserved.ts
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function fixStockReserved() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/solar-os';
  console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***@'));

  const conn = await mongoose.connect(mongoUri);
  console.log('Connected.');

  const db = conn.connection.db!;

  // Fix items collection
  const items = await db.collection('items').find({ reserved: { $gt: 0 } }).toArray();
  console.log(`Found ${items.length} items with reserved > 0`);

  let fixed = 0;
  for (const item of items) {
    const reserved = item.reserved || 0;
    const currentStock = item.stock || 0;
    const correctedStock = currentStock + reserved;

    await db.collection('items').updateOne(
      { _id: item._id },
      { $set: { stock: correctedStock } }
    );

    console.log(`  ${item.itemId || item._id}: stock ${currentStock} → ${correctedStock} (reserved: ${reserved})`);
    fixed++;
  }

  console.log(`\nFixed ${fixed} items in 'items' collection.`);
  await mongoose.disconnect();
  console.log('Done!');
}

fixStockReserved().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
