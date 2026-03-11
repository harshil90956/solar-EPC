/**
 * Delete all vendors from database
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

  // Delete all vendors
  const result = await mongoose.connection.collection('vendors').deleteMany({});
  console.log(`✓ Deleted ${result.deletedCount} vendors from database`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
