/**
 * Delete orphaned installations that have no matching projects
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI not found in env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const result = await mongoose.connection.collection('installations').deleteMany({
    installationId: { $in: ['ILMMIS18OGA95', 'ILMMIS3Y0BRUW', 'ILMMISFLL1RIR'] }
  });

  console.log('Deleted', result.deletedCount, 'orphaned installations');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
