const mongoose = require('mongoose');

// Replace with your MongoDB URI from .env
const MONGO_URI='mongodb+srv://gajeraakshit53_db_user:lvbGcIFW0ul5Bao6@akshit.thyfwea.mongodb.net/solar?retryWrites=true&w=majority';

// The tenant ID from your logs
const TARGET_TENANT_ID = '69b3a89aa62e43be08282a47';

async function diagnose() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to database:', mongoose.connection.db.databaseName);

  // Check Leads collection
  const leadsCount = await mongoose.connection.db.collection('leads').countDocuments();
  const leadsInTenant = await mongoose.connection.db.collection('leads').countDocuments({
    tenantId: new mongoose.Types.ObjectId(TARGET_TENANT_ID)
  });
  const customerLeads = await mongoose.connection.db.collection('leads').countDocuments({
    tenantId: new mongoose.Types.ObjectId(TARGET_TENANT_ID),
    $or: [
      { status: { $regex: '^customer$', $options: 'i' } },
      { stage: { $regex: '^customer$', $options: 'i' } },
      { statusKey: { $regex: '^customer$', $options: 'i' } }
    ]
  });

  console.log('\n=== LEADS ===');
  console.log('Total leads:', leadsCount);
  console.log('Leads in tenant', TARGET_TENANT_ID, ':', leadsInTenant);
  console.log('Customer leads:', customerLeads);

  // Show sample leads
  const sampleLeads = await mongoose.connection.db.collection('leads')
    .find({ tenantId: new mongoose.Types.ObjectId(TARGET_TENANT_ID) })
    .limit(3)
    .toArray();
  console.log('\nSample leads in tenant:');
  sampleLeads.forEach(l => {
    console.log('  -', l.leadId, '| status:', l.status, '| statusKey:', l.statusKey, '| stage:', l.stage);
  });

  // Check Projects
  const projectsCount = await mongoose.connection.db.collection('projects').countDocuments({
    tenantId: new mongoose.Types.ObjectId(TARGET_TENANT_ID)
  });
  console.log('\n=== PROJECTS ===');
  console.log('Projects in tenant:', projectsCount);

  // Check Inventory/Items
  const itemsCount = await mongoose.connection.db.collection('inventoryitems').countDocuments({
    tenantId: new mongoose.Types.ObjectId(TARGET_TENANT_ID)
  });
  console.log('\n=== INVENTORY ITEMS ===');
  console.log('Items in tenant:', itemsCount);

  // Check all tenant IDs in leads
  const allTenantIds = await mongoose.connection.db.collection('leads')
    .distinct('tenantId');
  console.log('\n=== ALL TENANT IDs IN LEADS ===');
  console.log(allTenantIds.map(id => id.toString()));

  await mongoose.disconnect();
}

diagnose().catch(console.error);
