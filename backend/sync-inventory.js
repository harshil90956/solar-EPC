const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/solar_epc';

async function syncItemsToInventory() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const itemsCollection = db.collection('items');
    const inventoryCollection = db.collection('inventories');
    
    // Get all items from items collection
    const items = await itemsCollection.find({}).toArray();
    console.log(`Found ${items.length} items in 'items' collection`);
    
    // Sync each item to inventory
    for (const item of items) {
      const existingInventory = await inventoryCollection.findOne({ itemId: item.itemId });
      
      if (!existingInventory) {
        // Create new inventory entry
        const inventoryDoc = {
          tenantId: item.tenantId || new ObjectId(),
          isDeleted: false,
          itemId: item.itemId,
          name: item.name,
          category: item.category || 'Other',
          unit: item.unit || 'Nos',
          stock: item.stock || 0,
          reserved: item.reserved || 0,
          available: (item.stock || 0) - (item.reserved || 0),
          minStock: item.minStock || 0,
          rate: item.rate || 0,
          warehouse: item.warehouse || 'Main Warehouse',
          lastUpdated: new Date().toISOString().split('T')[0],
          status: 'In Stock'
        };
        
        await inventoryCollection.insertOne(inventoryDoc);
        console.log(`Created inventory for ${item.itemId}: ${item.name}`);
      } else {
        // Update existing inventory
        await inventoryCollection.updateOne(
          { itemId: item.itemId },
          {
            $set: {
              name: item.name,
              category: item.category || existingInventory.category,
              unit: item.unit || existingInventory.unit,
              rate: item.rate || existingInventory.rate,
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          }
        );
        console.log(`Updated inventory for ${item.itemId}`);
      }
    }
    
    // Special fix for INV3552 - reset reserved to 0
    const inv3552 = await inventoryCollection.findOne({ itemId: 'INV3552' });
    if (inv3552) {
      const newReserved = 0;
      const newAvailable = inv3552.stock;
      
      await inventoryCollection.updateOne(
        { itemId: 'INV3552' },
        {
          $set: {
            reserved: newReserved,
            available: newAvailable,
            status: 'In Stock',
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        }
      );
      console.log(`\n✅ INV3552 FIXED: reserved=${newReserved}, available=${newAvailable}, stock=${inv3552.stock}`);
    } else {
      console.log('\n❌ INV3552 not found - cannot fix');
    }
    
    // Show current state of INV3552
    console.log('\n========== CURRENT STATE ==========');
    const allInv = await inventoryCollection.find({}, { itemId: 1, name: 1, stock: 1, reserved: 1, available: 1 })
      .limit(5).toArray();
    console.log(allInv);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

syncItemsToInventory();
