import 'reflect-metadata';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/core/auth/schemas/user.schema';

dotenv.config();

async function checkUsers() {
  console.log('🔍 Checking Users in Database...\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI not found in .env file!');
    process.exit(1);
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected (Atlas)\n');

  const userModel = mongoose.model<User>('User', UserSchema);

  // Find all users
  const allUsers = await userModel.find({}).lean();
  
  console.log(`📊 Total users found: ${allUsers.length}\n`);
  
  if (allUsers.length === 0) {
    console.log('⚠️  No users in database!\n');
  } else {
    console.log('📋 Users:');
    allUsers.forEach((user: any, index) => {
      console.log(`\n${index + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Is Super Admin: ${user.isSuperAdmin}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Has Password Hash: ${!!user.passwordHash}`);
    });
  }

  // Check specifically for superadmin
  const superadmin = await userModel.findOne({ 
    email: 'superadmin@solarios.com',
    isSuperAdmin: true 
  }).lean();

  if (superadmin) {
    console.log('\n✅ Superadmin user EXISTS!');
    console.log(`   ID: ${superadmin._id}`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Role: ${superadmin.role}`);
  } else {
    console.log('\n❌ Superadmin user NOT FOUND!');
    console.log('   Run: npx ts-node scripts/create-superadmin.ts');
  }

  await mongoose.disconnect();
}

checkUsers().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
