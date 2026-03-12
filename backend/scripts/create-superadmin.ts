import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';
import { User, UserSchema } from '../src/core/auth/schemas/user.schema';

dotenv.config();

async function bootstrap() {
  console.log('🚀 Creating Superadmin User...\n');

  // Connect to MongoDB using .env configuration
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI not found in .env file!');
    process.exit(1);
  }
  
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected (Atlas)\n');

  const tenantModel = mongoose.model<Tenant>('Tenant', TenantSchema);
  const userModel = mongoose.model<User>('User', UserSchema);

  // Create default tenant if not exists
  let defaultTenant = await tenantModel.findOne({ code: 'DEFAULT' });
  
  if (!defaultTenant) {
    defaultTenant = await tenantModel.create({
      name: 'Default Tenant',
      code: 'DEFAULT',
      isActive: true,
    });
    console.log('✅ Created Default Tenant');
  } else {
    console.log('ℹ️  Default Tenant already exists');
  }

  // Check if superadmin user exists
  const existingAdmin = await userModel.findOne({ 
    email: 'superadmin@solarios.com',
    tenantId: defaultTenant._id 
  });

  if (existingAdmin) {
    console.log('\n❌ Superadmin user already exists!');
    console.log('\nLogin credentials:');
    console.log('Email: superadmin@solarios.com');
    console.log('Password: SuperAdmin@123');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Create superadmin user
  const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
  
  const superadmin = await userModel.create({
    email: 'superadmin@solarios.com',
    passwordHash: hashedPassword,
    name: 'Super Administrator',
    role: 'Super Admin',
    isSuperAdmin: true,
    tenantId: defaultTenant._id,
    dataScope: 'ALL',
    isActive: true,
  });

  console.log('✅ Created Superadmin User');
  console.log('\n🎉 Setup Complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:     superadmin@solarios.com');
  console.log('🔑 Password:  SuperAdmin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
