const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/solar_epc';

async function diagnose() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('========== COLLECTIONS ==========');
    const collections = await db.listCollections().toArray();
    console.log(collections.map(c => c.name));
    
    console.log('\n========== ITEMS COLLECTION (check if INV3552 exists) ==========');
    const itemsCollection = db.collection('items');
    const itemsCount = await itemsCollection.countDocuments();
    console.log(`Total items: ${itemsCount}`);
    
    const inv3552InItems = await itemsCollection.findOne({ itemId: 'INV3552' });
    if (inv3552InItems) {
      console.log('✅ INV3552 found in items:');
      console.log({
        itemId: inv3552InItems.itemId,
        name: inv3552InItems.name,
        stock: inv3552InItems.stock,
        reserved: inv3552InItems.reserved,
        available: inv3552InItems.available
      });
    } else {
      console.log('❌ INV3552 NOT found in items');
    }
    
    console.log('\n========== INVENTORIES COLLECTION ==========');
    const inventoryCollection = db.collection('inventories');
    const invCount = await inventoryCollection.countDocuments();
    console.log(`Total inventory docs: ${invCount}`);
    
    const inv3552InInventory = await inventoryCollection.findOne({ itemId: 'INV3552' });
    if (inv3552InInventory) {
      console.log('✅ INV3552 found in inventories:');
      console.log({
        itemId: inv3552InInventory.itemId,
        name: inv3552InInventory.name,
        stock: inv3552InInventory.stock,
        reserved: inv3552InInventory.reserved,
        available: inv3552InInventory.available
      });
    } else {
      console.log('❌ INV3552 NOT found in inventories');
    }
    
    console.log('\n========== SAMPLE FROM BOTH ==========');
    const sampleItems = await itemsCollection.find({}, {itemId: 1, name: 1}).limit(3).toArray();
    console.log('Sample items:', sampleItems);
    
    const sampleInv = await inventoryCollection.find({}, {itemId: 1, name: 1}).limit(3).toArray();
    console.log('Sample inventories:', sampleInv);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

diagnose();
