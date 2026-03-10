/**
 * Quick check - list all installations in DB
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
  
  const installations = await mongoose.connection.collection('installations').find({}).toArray();
  
  console.log(`Found ${installations.length} installations:\n`);
  
  for (const inst of installations) {
    console.log(`- ${inst.installationId}`);
    console.log(`  Project ID: ${inst.projectId}`);
    console.log(`  Customer: ${inst.customerName}`);
    console.log(`  Status: ${inst.status}`);
    console.log(`  Tenant: ${inst.tenantId}`);
    console.log('');
  }
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
