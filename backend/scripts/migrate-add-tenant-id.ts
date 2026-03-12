/**
 * Migration Script: Add tenantId to existing records
 * 
 * Usage: 
 * 1. Update DEFAULT_TENANT_ID below with your default tenant ObjectId
 * 2. Run: npx ts-node scripts/migrate-add-tenant-id.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// ⚠️ UPDATE THIS WITH YOUR DEFAULT TENANT ID
const DEFAULT_TENANT_ID = 'YOUR_DEFAULT_TENANT_OBJECTID_HERE';

const collections = [
  'projects',
  'leads',
  'surveys',
  'quotations',
  'designs',
  'inventory',
  'items',
  'procurement',
  'logistics',
  'installations',
  'finance',
  'serviceamc',
  'compliance',
];

async function migrateCollection(model: Model<any>, collectionName: string) {
  try {
    const result = await model.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: new Types.ObjectId(DEFAULT_TENANT_ID) } }
    );

    console.log(`✅ ${collectionName}: Modified ${result.modifiedCount} documents, Matched ${result.matchedCount}`);
    return result;
  } catch (error) {
    console.error(`❌ ${collectionName}: Error - ${(error as Error).message}`);
    throw error;
  }
}

async function bootstrap() {
  console.log('🚀 Starting tenantId migration...\n');

  if (DEFAULT_TENANT_ID === 'YOUR_DEFAULT_TENANT_OBJECTID_HERE') {
    console.error('❌ ERROR: Please update DEFAULT_TENANT_ID in the script before running!');
    process.exit(1);
  }

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get all models dynamically
    const moduleRefs = await Promise.all(collections.map(async (collection) => {
      const modelName = collection.charAt(0).toUpperCase() + collection.slice(1);
      try {
        const modelRef = app.get<Model<any>>(`Model.${modelName}`);
        return { collection, model: modelRef };
      } catch (error) {
        console.warn(`⚠️  ${collection}: Model not found, skipping...`);
        return null;
      }
    }));

    for (const ref of moduleRefs.filter(Boolean)) {
      const { collection, model } = ref as { collection: string; model: Model<any> };
      await migrateCollection(model, collection);
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Verify data in MongoDB Compass or shell');
    console.log('   2. Create indexes: db.collection.createIndex({ tenantId: 1, createdAt: -1 })');
    console.log('   3. Test tenant isolation with different tenant accounts');

    await app.close();
  } catch (error) {
    console.error('\n❌ Migration failed:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
