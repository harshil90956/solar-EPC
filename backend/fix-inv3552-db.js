// Direct MongoDB fix for INV3552 - No API needed
// Run: node fix-inv3552-db.js

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string - same as your backend
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solar_epc';

async function fixINV3552() {
  console.log('🔧 Connecting to MongoDB...');
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Try 'items' collection first (most common)
    let collection = db.collection('items');
    let item = await collection.findOne({ itemId: 'INV3552' });
    
    // If not found, try 'inventories' collection
    if (!item) {
      collection = db.collection('inventories');
      item = await collection.findOne({ itemId: 'INV3552' });
    }
    
    // Try by _id if itemId not found
    if (!item) {
      item = await collection.findOne({ _id: 'INV3552' });
    }
    
    if (!item) {
      console.log('❌ INV3552 not found in database');
      console.log('Available collections:', await db.listCollections().toArray().then(c => c.map(x => x.name)));
      return;
    }
    
    console.log('📦 Found Item:');
    console.log('  ID:', item._id);
    console.log('  ItemId:', item.itemId);
    console.log('  Name:', item.name || item.description);
    console.log('  Stock:', item.stock);
    console.log('  Reserved:', item.reserved);
    console.log('  Available:', item.available);
    console.log('  Collection:', collection.collectionName);
    
    if (item.reserved === 0) {
      console.log('\n✅ Already fixed - no reserved stock');
      return;
    }
    
    // FORCE FIX: Update directly in database
    const result = await collection.updateOne(
      { _id: item._id },
      { 
        $set: { 
          reserved: 0,
          available: item.stock || 1000
        }
      }
    );
    
    if (result.modifiedCount === 1) {
      console.log('\n🎉 SUCCESS! Fixed INV3552:');
      console.log(`  Reserved: ${item.reserved} → 0`);
      console.log(`  Available: ${item.available} → ${item.stock || 1000}`);
      console.log('\n⚠️  IMPORTANT: Refresh your browser to see updated values!');
    } else {
      console.log('\n⚠️  Update failed or no changes made');
    }
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.log('Make sure MongoDB is running!');
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixINV3552();
