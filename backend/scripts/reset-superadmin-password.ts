import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/core/auth/schemas/user.schema';

dotenv.config();

async function resetPassword() {
  console.log('🔑 Resetting Superadmin Password...\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI not found in .env file!');
    process.exit(1);
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected (Atlas)\n');

  const userModel = mongoose.model<User>('User', UserSchema);

  // Find superadmin
  const superadmin = await userModel.findOne({ 
    email: 'superadmin@solarios.com',
    isSuperAdmin: true 
  });

  if (!superadmin) {
    console.log('❌ Superadmin user NOT FOUND!');
    console.log('   Run: npx ts-node scripts/create-superadmin.ts');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Reset password
  const newPassword = 'SuperAdmin@123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  superadmin.passwordHash = hashedPassword;
  await superadmin.save();

  console.log('✅ Password reset successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:     superadmin@solarios.com');
  console.log('🔑 Password:  SuperAdmin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
}

resetPassword().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
