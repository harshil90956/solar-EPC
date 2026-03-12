import 'reflect-metadata';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';

dotenv.config();

async function checkTenants() {
  console.log('🏢 Checking Tenants in Database...\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI not found in .env file!');
    process.exit(1);
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected (Atlas)\n');

  const tenantModel = mongoose.model<Tenant>('Tenant', TenantSchema);

  // Find all tenants
  const allTenants = await tenantModel.find({}).lean();
  
  console.log(`📊 Total tenants found: ${allTenants.length}\n`);
  
  if (allTenants.length === 0) {
    console.log('⚠️  No tenants in database!\n');
  } else {
    console.log('📋 Existing Tenants:');
    allTenants.forEach((tenant: any, index) => {
      console.log(`\n${index + 1}. Name: ${tenant.name}`);
      console.log(`   Code: ${tenant.code}`);
      console.log(`   Active: ${tenant.isActive}`);
      console.log(`   Created: ${tenant.createdAt}`);
    });
  }

  await mongoose.disconnect();
}

checkTenants().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
