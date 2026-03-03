import 'reflect-metadata';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in .env');
  }

  await mongoose.connect(mongoUri);

  // Minimal migration:
  // - For leads missing `statusKey`, set it from legacy `stage` when present
  // - Fallback to 'new'
  const leadsCollection = mongoose.connection.collection('leads');

  const cursor = leadsCollection.find({ statusKey: { $exists: false } }, { projection: { stage: 1 } });

  let updated = 0;
  while (await cursor.hasNext()) {
    const doc: any = await cursor.next();
    if (!doc) break;

    const legacyStage = typeof doc.stage === 'string' && doc.stage.trim() ? doc.stage.trim() : 'new';
    const statusKey = legacyStage;

    await leadsCollection.updateOne({ _id: doc._id }, { $set: { statusKey } });
    updated++;
  }

  process.stdout.write(`Migration completed. Updated ${updated} lead(s)\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  process.stderr.write(`Migration failed: ${String(err)}\n`);
  process.exit(1);
});
