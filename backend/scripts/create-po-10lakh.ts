/**
 * Create a Purchase Order with 10,00,000 value
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not found');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  
  // Check vendors
  const vendors = await mongoose.connection.collection('vendors').find({ isActive: true }).toArray();
  console.log(`Found ${vendors.length} vendors:`);
  vendors.forEach(v => console.log(` - ${v.id}: ${v.name}`));
  
  if (vendors.length === 0) {
    console.error('No vendors found! Run seed-vendors.ts first');
    await mongoose.disconnect();
    process.exit(1);
  }
  
  const vendor = vendors[0]; // Use first vendor
  
  // Count existing POs
  const poCount = await mongoose.connection.collection('purchaseorders').countDocuments({});
  const poId = `PO${String(poCount + 1).padStart(3, '0')}`;
  
  const now = new Date();
  const orderedDate = now.toISOString().split('T')[0];
  
  const purchaseOrder = {
    id: poId,
    vendorId: vendor._id.toString(),
    vendorName: vendor.name,
    items: 'Solar Panels (500 units), Inverters (10 units), Mounting Structure',
    totalAmount: 1000000,
    status: 'Ordered',
    orderedDate,
    deliveredDate: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await mongoose.connection.collection('purchaseorders').insertOne(purchaseOrder);
  console.log(`\n✓ Created Purchase Order ${poId}`);
  console.log(`  Vendor: ${vendor.name} (${vendor.id})`);
  console.log(`  Amount: ₹${purchaseOrder.totalAmount.toLocaleString('en-IN')}`);
  console.log(`  Items: ${purchaseOrder.items}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
