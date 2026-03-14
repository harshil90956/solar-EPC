const mongoose = require('mongoose');

const MONGO_URI='mongodb+srv://gajeraakshit53_db_user:lvbGcIFW0ul5Bao6@akshit.thyfwea.mongodb.net/solar?retryWrites=true&w=majority';

// Source tenant (where data currently is) - SolarCorp
const SOURCE_TENANT_ID = '69a56c4774018b4d8142c648';
// Target tenant (where your user is) - ABC Company  
const TARGET_TENANT_ID = '69b3a89aa62e43be08282a47';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to database');

  const sourceObjId = new mongoose.Types.ObjectId(SOURCE_TENANT_ID);
  const targetObjId = new mongoose.Types.ObjectId(TARGET_TENANT_ID);

  // Collections to migrate
  const collections = ['leads', 'projects', 'inventoryitems', 'departments', 'quotations', 'invoices', 'surveys'];

  for (const collName of collections) {
    try {
      const collection = mongoose.connection.db.collection(collName);
      const count = await collection.countDocuments({ tenantId: sourceObjId });
      
      if (count > 0) {
        console.log(`\nMigrating ${count} documents from ${collName}...`);
        
        const result = await collection.updateMany(
          { tenantId: sourceObjId },
          { $set: { tenantId: targetObjId } }
        );
        
        console.log(`  ✓ Updated ${result.modifiedCount} documents in ${collName}`);
      } else {
        console.log(`\n${collName}: No documents to migrate`);
      }
    } catch (err) {
      console.log(`\n${collName}: Collection may not exist (${err.message})`);
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log('Data moved from SolarCorp to ABC Company');
  console.log('Refresh your browser to see the data!');

  await mongoose.disconnect();
}

migrate().catch(console.error);
