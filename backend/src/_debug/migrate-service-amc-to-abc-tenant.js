const mongoose = require('mongoose');

// abc@gmail.com's tenant ID
const ABC_COMPANY_TENANT_ID = '69b3a89aa62e43be08282a47';

async function main() {
  const args = process.argv.slice(2);
  const MONGO_URI = args[0];
  const apply = args.includes('--apply');

  if (!MONGO_URI) {
    console.log('Usage: node migrate-service-amc-to-abc-tenant.js <MONGO_URI> [--apply]');
    console.log('Example: node migrate-service-amc-to-abc-tenant.js mongodb://localhost:27017/solar_epc --apply');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  
  // Collections to update
  const tickets = db.collection('tickets');
  const amccontracts = db.collection('amccontracts');
  const visits = db.collection('visits');

  const targetTenantId = new mongoose.Types.ObjectId(ABC_COMPANY_TENANT_ID);

  console.log('\n========== SERVICE & AMC DATA MIGRATION ==========');
  console.log(`Target Tenant ID (abc@gmail.com): ${ABC_COMPANY_TENANT_ID}`);
  console.log(`Mode: ${apply ? 'APPLY CHANGES' : 'DRY RUN (preview only)'}`);
  console.log('=====================================================\n');

  // 1. MIGRATE TICKETS
  console.log('--- TICKETS MIGRATION ---');
  
  // Find tickets without tenantId or with different tenantId
  const ticketsWithoutTenant = await tickets.find({ 
    $or: [
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: { $ne: targetTenantId } }
    ],
    isDeleted: { $ne: true }
  }).toArray();

  console.log(`Found ${ticketsWithoutTenant.length} tickets to update`);
  
  if (ticketsWithoutTenant.length > 0 && apply) {
    const result = await tickets.updateMany(
      { 
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: { $ne: targetTenantId } }
        ],
        isDeleted: { $ne: true }
      },
      { $set: { tenantId: targetTenantId } }
    );
    console.log(`✅ Updated ${result.modifiedCount} tickets with tenantId ${ABC_COMPANY_TENANT_ID}`);
  } else if (ticketsWithoutTenant.length > 0) {
    console.log(`🧪 Dry-run: Would update ${ticketsWithoutTenant.length} tickets`);
    console.log('Sample tickets to update:');
    ticketsWithoutTenant.slice(0, 3).forEach(t => {
      console.log(`  - Ticket ${t.ticketId || t._id}: ${t.customerName || 'N/A'}`);
    });
  } else {
    console.log('ℹ️ No tickets need updating');
  }

  // 2. MIGRATE AMC CONTRACTS
  console.log('\n--- AMC CONTRACTS MIGRATION ---');
  
  const contractsWithoutTenant = await amccontracts.find({ 
    $or: [
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: { $ne: targetTenantId } }
    ],
    isDeleted: { $ne: true }
  }).toArray();

  console.log(`Found ${contractsWithoutTenant.length} AMC contracts to update`);
  
  if (contractsWithoutTenant.length > 0 && apply) {
    const result = await amccontracts.updateMany(
      { 
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: { $ne: targetTenantId } }
        ],
        isDeleted: { $ne: true }
      },
      { $set: { tenantId: targetTenantId } }
    );
    console.log(`✅ Updated ${result.modifiedCount} AMC contracts with tenantId ${ABC_COMPANY_TENANT_ID}`);
  } else if (contractsWithoutTenant.length > 0) {
    console.log(`🧪 Dry-run: Would update ${contractsWithoutTenant.length} AMC contracts`);
    console.log('Sample contracts to update:');
    contractsWithoutTenant.slice(0, 3).forEach(c => {
      console.log(`  - Contract ${c.contractId || c._id}: ${c.customer || 'N/A'} - ${c.site || 'N/A'}`);
    });
  } else {
    console.log('ℹ️ No AMC contracts need updating');
  }

  // 3. MIGRATE VISITS
  console.log('\n--- VISITS MIGRATION ---');
  
  const visitsWithoutTenant = await visits.find({ 
    $or: [
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: { $ne: targetTenantId } }
    ],
    isDeleted: { $ne: true }
  }).toArray();

  console.log(`Found ${visitsWithoutTenant.length} visits to update`);
  
  if (visitsWithoutTenant.length > 0 && apply) {
    const result = await visits.updateMany(
      { 
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: { $ne: targetTenantId } }
        ],
        isDeleted: { $ne: true }
      },
      { $set: { tenantId: targetTenantId } }
    );
    console.log(`✅ Updated ${result.modifiedCount} visits with tenantId ${ABC_COMPANY_TENANT_ID}`);
  } else if (visitsWithoutTenant.length > 0) {
    console.log(`🧪 Dry-run: Would update ${visitsWithoutTenant.length} visits`);
    console.log('Sample visits to update:');
    visitsWithoutTenant.slice(0, 3).forEach(v => {
      console.log(`  - Visit ${v.visitId || v._id}: ${v.customer || 'N/A'} - ${v.site || 'N/A'}`);
    });
  } else {
    console.log('ℹ️ No visits need updating');
  }

  // SUMMARY
  console.log('\n========== MIGRATION SUMMARY ==========');
  console.log(`Tickets:     ${ticketsWithoutTenant.length} to update`);
  console.log(`AMC Contracts: ${contractsWithoutTenant.length} to update`);
  console.log(`Visits:      ${visitsWithoutTenant.length} to update`);
  console.log('=======================================');
  
  if (!apply) {
    console.log('\n⚠️ This was a DRY RUN. No changes were made.');
    console.log('To apply changes, run with --apply flag:');
    console.log(`node migrate-service-amc-to-abc-tenant.js ${MONGO_URI} --apply`);
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log(`All data is now associated with abc@gmail.com's tenant (${ABC_COMPANY_TENANT_ID})`);
  }
}

main()
  .catch(console.error)
  .finally(() => mongoose.disconnect());
