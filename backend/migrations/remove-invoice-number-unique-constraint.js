const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env file directly
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const mongoUriMatch = envContent.match(/^MONGO_URI=(.+)$/m);
const mongoUri = mongoUriMatch ? mongoUriMatch[1].trim() : null;

async function dropInvoiceNumberUniqueIndex() {
  try {
    console.log('MONGO_URI:', mongoUri ? 'Loaded' : 'NOT LOADED');
    
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully');

    const db = mongoose.connection;
    const invoicesCollection = db.collection('invoices');

    // List all indexes on invoices collection
    console.log('\nCurrent indexes on invoices collection:');
    const indexes = await invoicesCollection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`    ⚠️  UNIQUE constraint found`);
      }
    });

    // Check if the unique indexes exist
    const uniqueIndexExists = indexes.some(
      idx => idx.name === 'tenantId_1_invoiceNumber_1' && idx.unique === true
    );
    
    const invoiceNumberUniqueExists = indexes.some(
      idx => idx.name === 'invoiceNumber_1' && idx.unique === true
    );

    if (uniqueIndexExists) {
      console.log('\n⚠️  Found unique index: tenantId_1_invoiceNumber_1');
      console.log('Dropping the unique index...');
      
      // Drop the unique index
      await invoicesCollection.dropIndex('tenantId_1_invoiceNumber_1');
      console.log('✅ Unique index dropped successfully!');
      
      // Create a non-unique index with the same fields
      await invoicesCollection.createIndex({ tenantId: 1, invoiceNumber: 1 });
      console.log('✅ Created new non-unique index on tenantId and invoiceNumber');
    } else {
      console.log('\n✅ No unique index found on tenantId + invoiceNumber');
      console.log('Creating non-unique index...');
      await invoicesCollection.createIndex({ tenantId: 1, invoiceNumber: 1 });
      console.log('✅ Non-unique index created successfully');
    }

    // Also drop the standalone invoiceNumber unique index if it exists
    if (invoiceNumberUniqueExists) {
      console.log('\n⚠️  Found unique index: invoiceNumber_1');
      console.log('Dropping this unique index too...');
      await invoicesCollection.dropIndex('invoiceNumber_1');
      console.log('✅ Standalone invoiceNumber unique index dropped!');
      
      // Create a non-unique index
      await invoicesCollection.createIndex({ invoiceNumber: 1 });
      console.log('✅ Created new non-unique index on invoiceNumber');
    }

    // Verify the changes
    console.log('\nFinal indexes after update:');
    const finalIndexes = await invoicesCollection.indexes();
    finalIndexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      if (index.unique) {
        console.log(`    ⚠️  UNIQUE constraint found`);
      }
    });

    console.log('\n✅ Migration completed successfully!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  }
}

dropInvoiceNumberUniqueIndex();
