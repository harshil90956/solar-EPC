// Direct MongoDB fix for INV3552
// Run: node fix-inventory-direct.js

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar_epc';
const itemId = 'INV3552';

async function fixInventory() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const inventoryCollection = db.collection('items'); // or 'inventories'
    
    // Find the item
    const item = await inventoryCollection.findOne({ itemId: itemId });
    
    if (!item) {
      console.log(`❌ Item ${itemId} not found`);
      return;
    }
    
    console.log('\n📊 Current State:');
    console.log(`  Item: ${item.name || item.description}`);
    console.log(`  Stock: ${item.stock}`);
    console.log(`  Reserved: ${item.reserved}`);
    console.log(`  Available: ${item.available}`);
    
    if (item.reserved === 0) {
      console.log('\n✅ Already fixed - no reserved stock');
      return;
    }
    
    // Fix: Set reserved to 0, available to stock
    const result = await inventoryCollection.updateOne(
      { _id: item._id },
      { 
        $set: { 
          reserved: 0,
          available: item.stock,
          status: 'In Stock'
        } 
      }
    );
    
    if (result.modifiedCount === 1) {
      console.log('\n✅ SUCCESS! Inventory fixed:');
      console.log(`  Reserved: ${item.reserved} -> 0`);
      console.log(`  Available: ${item.available} -> ${item.stock}`);
      console.log('\n🔄 Refresh the inventory page to see the changes');
    } else {
      console.log('\n⚠️ No changes made');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

fixInventory();
