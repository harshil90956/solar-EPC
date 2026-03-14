const mongoose = require('mongoose');

const TARGET_EMAIL = 'abc@gmail.com';
const RENAMED_EMAIL = 'abc+abccompany@gmail.com';
const SOLARCORP_TENANT_ID = '69a56c4774018b4d8142c648';
const ABC_COMPANY_TENANT_ID = '69b3a89aa62e43be08282a47';

async function main() {
  const args = process.argv.slice(2);
  const MONGO_URI = args[0];
  const apply = args.includes('--apply');

  if (!MONGO_URI) {
    console.log('Usage: node reverse-migration.js <MONGO_URI> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // 1. Find the renamed user in abc-company
  const renamedUser = await users.findOne({ 
    email: RENAMED_EMAIL, 
    tenantId: new mongoose.Types.ObjectId(ABC_COMPANY_TENANT_ID) 
  });

  if (renamedUser) {
    console.log(`\nFound renamed user: _id=${renamedUser._id}, email=${renamedUser.email}`);
    if (apply) {
      await users.updateOne(
        { _id: renamedUser._id },
        { $set: { email: TARGET_EMAIL } }
      );
      console.log(`✅ Restored email to ${TARGET_EMAIL} for abc-company user.`);
    } else {
      console.log(`🧪 Dry-run: would restore email to ${TARGET_EMAIL}`);
    }
  } else {
    console.log('\nℹ️ No renamed user found in abc-company.');
  }

  // 2. Find the solarcorp user and deactivate (reversing the activation)
  const solarcorpUser = await users.findOne({ 
    email: TARGET_EMAIL, 
    tenantId: new mongoose.Types.ObjectId(SOLARCORP_TENANT_ID) 
  });

  if (solarcorpUser) {
    console.log(`Found solarcorp user: _id=${solarcorpUser._id}, email=${solarcorpUser.email}, isActive=${solarcorpUser.isActive}`);
    if (solarcorpUser.isActive === true) {
      if (apply) {
        await users.updateOne(
          { _id: solarcorpUser._id },
          { $set: { isActive: false } }
        );
        console.log(`✅ Deactivated solarcorp user (restored to original state).`);
      } else {
        console.log(`🧪 Dry-run: would deactivate solarcorp user.`);
      }
    }
  } else {
    console.log('ℹ️ No solarcorp user found.');
  }
}

main()
  .catch(console.error)
  .finally(() => mongoose.disconnect());
