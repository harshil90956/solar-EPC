/**
 * Seed procurement vendors
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const vendors = [
  { id: 'V001', name: 'Tata Power Solar', category: 'Panel', contact: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'sales@tatapowersolar.com', city: 'Mumbai', rating: 5, isActive: true, totalOrders: 0 },
  { id: 'V002', name: 'Waaree Energies', category: 'Panel', contact: 'Sunil Patel', phone: '+91 98765 43211', email: 'contact@waaree.com', city: 'Surat', rating: 4, isActive: true, totalOrders: 0 },
  { id: 'V003', name: 'Sungrow India', category: 'Inverter', contact: 'Priya Sharma', phone: '+91 98765 43212', email: 'india@sungrow.com', city: 'Bangalore', rating: 5, isActive: true, totalOrders: 0 },
  { id: 'V004', name: 'ABB India', category: 'Inverter', contact: 'Vikram Mehta', phone: '+91 98765 43213', email: 'contact@abb.com', city: 'Ahmedabad', rating: 4, isActive: true, totalOrders: 0 },
  { id: 'V005', name: 'Sterling Wilson', category: 'Structure', contact: 'Anil Gupta', phone: '+91 98765 43214', email: 'info@sterlingwilson.com', city: 'Pune', rating: 4, isActive: true, totalOrders: 0 },
];

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not found');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  
  for (const vendor of vendors) {
    await mongoose.connection.collection('vendors').updateOne(
      { id: vendor.id },
      { $set: vendor },
      { upsert: true }
    );
    console.log(`✓ Seeded vendor: ${vendor.id} - ${vendor.name}`);
  }
  
  console.log('\n✓ All vendors seeded successfully');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
