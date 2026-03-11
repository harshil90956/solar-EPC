/**
 * Delete seed vendors from logistics_vendors collection permanently
 * Targets: V001, V002, V003, V004, V005 (Tata Power Solar, Waaree Energies, etc.)
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not found in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Delete seed vendors permanently
  const seedVendorIds = ['V001', 'V002', 'V003', 'V004', 'V005'];
  
  console.log('Deleting seed vendors:', seedVendorIds.join(', '));
  
  const result = await mongoose.connection.collection('logistics_vendors').deleteMany({ 
    id: { $in: seedVendorIds } 
  });
  
  console.log(`✓ Deleted ${result.deletedCount} seed vendors from logistics_vendors`);
  
  // Also check if any vendors exist with these names (backup check)
  const seedVendorNames = [
    'Tata Power Solar',
    'Waaree Energies', 
    'Sungrow India',
    'ABB India',
    'Sterling Wilson'
  ];
  
  const nameResult = await mongoose.connection.collection('logistics_vendors').deleteMany({
    name: { $in: seedVendorNames }
  });
  
  console.log(`✓ Deleted ${nameResult.deletedCount} vendors by name match`);
  
  // Show remaining vendors count
  const remaining = await mongoose.connection.collection('logistics_vendors').countDocuments();
  console.log(`✓ Remaining vendors in database: ${remaining}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
