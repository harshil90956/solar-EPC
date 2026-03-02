import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import mongoose, { Model } from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';
import { User, UserSchema } from '../src/core/auth/schemas/user.schema';

dotenv.config();

type TenantModel = Model<Tenant>;
type UserModel = Model<User>;

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in .env');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required in .env');
  }

  await mongoose.connect(mongoUri);

  const TenantM: TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const UserM: UserModel = mongoose.model(User.name, UserSchema);

  const tenantCode = 'solarcorp';
  const tenantName = 'SolarCorp India Pvt. Ltd.';

  const tenant =
    (await TenantM.findOne({ code: tenantCode })) ??
    (await TenantM.create({ code: tenantCode, name: tenantName, isActive: true }));

  const passwordHash = await bcrypt.hash('123456', 10);

  // Super Admin (no tenant)
  await UserM.updateOne(
    { email: 'harshildobariya070@gmail.com' },
    {
      $set: {
        email: 'harshildobariya070@gmail.com',
        passwordHash,
        role: 'Admin',
        tenantId: undefined,
        isSuperAdmin: true,
        isActive: true,
      },
    },
    { upsert: true },
  );

  // Tenant Admin
  await UserM.updateOne(
    { email: 'abc@gmail.com', tenantId: tenant._id },
    {
      $set: {
        email: 'abc@gmail.com',
        passwordHash,
        role: 'Admin',
        tenantId: tenant._id,
        isSuperAdmin: false,
        isActive: true,
      },
    },
    { upsert: true },
  );

  // Ensure unique index is created
  await UserM.syncIndexes();
  await TenantM.syncIndexes();

  await mongoose.disconnect();
}

main()
  .then(() => {
    process.stdout.write('Seed completed\n');
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(`Seed failed: ${String(err)}\n`);
    process.exit(1);
  });
