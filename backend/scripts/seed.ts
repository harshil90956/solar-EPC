import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import mongoose, { Model, Types } from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';
import { User, UserSchema } from '../src/core/auth/schemas/user.schema';
import { Vendor, VendorSchema } from '../src/modules/procurement/schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../src/modules/procurement/schemas/purchase-order.schema';

dotenv.config();

type TenantModel = Model<Tenant>;
type UserModel = Model<User>;
type VendorModel = Model<Vendor>;
type PurchaseOrderModel = Model<PurchaseOrder>;

const VENDORS_SEED = [
  { name: 'Adani Solar', category: 'Panel', contact: 'Rajesh Kumar', phone: '9876543210', email: 'sales@adani-solar.com', city: 'Ahmedabad', rating: 5 },
  { name: 'Tata Power Solar', category: 'Panel', contact: 'Priya Sharma', phone: '9876543211', email: 'contact@tatapowersolar.com', city: 'Mumbai', rating: 4 },
  { name: 'SMA India', category: 'Inverter', contact: 'Anil Verma', phone: '9876543212', email: 'info@sma-india.com', city: 'Bangalore', rating: 5 },
  { name: 'Waaree Energies', category: 'Structure', contact: 'Sunil Patel', phone: '9876543213', email: 'sales@waaree.com', city: 'Surat', rating: 4 },
  { name: 'Havells India', category: 'Cable', contact: 'Vikram Singh', phone: '9876543214', email: 'epc@havells.com', city: 'Delhi', rating: 4 },
];

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
  const VendorM: VendorModel = mongoose.model(Vendor.name, VendorSchema);
  const PurchaseOrderM: PurchaseOrderModel = mongoose.model(PurchaseOrder.name, PurchaseOrderSchema);

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

  // Seed Vendors
  console.log('Seeding vendors...');
  const createdVendors: any[] = [];
  for (let i = 0; i < VENDORS_SEED.length; i++) {
    const vendorData = VENDORS_SEED[i];
    const vendorId = `V${String(i + 1).padStart(3, '0')}`;
    
    const vendor = await VendorM.findOneAndUpdate(
      { id: vendorId },
      {
        $set: {
          ...vendorData,
          id: vendorId,
          totalOrders: 0,
          isActive: true,
          tenantId: null,
        },
      },
      { upsert: true, new: true },
    );
    console.log(`Created/Updated vendor: ${vendor.name} (${vendor.id})`);
    createdVendors.push(vendor);
  }

  // Seed Purchase Orders
  console.log('Seeding purchase orders...');
  const poData = [
    { vendorIndex: 0, items: '200 x 400W Mono PERC Panels', totalAmount: 2900000, expectedDate: '2024-03-15', status: 'Ordered' },
    { vendorIndex: 2, items: '50 x 50kW SMA Sunny Central Inverters', totalAmount: 4500000, expectedDate: '2024-03-20', status: 'In Transit' },
    { vendorIndex: 3, items: 'Solar Mounting Structures for 1MW', totalAmount: 850000, expectedDate: '2024-03-25', status: 'Delivered' },
    { vendorIndex: 1, items: '100 x 400W Poly Panels', totalAmount: 1450000, expectedDate: '2024-04-01', status: 'Draft' },
    { vendorIndex: 4, items: 'AC/DC Cables (5km each)', totalAmount: 320000, expectedDate: '2024-04-05', status: 'Ordered' },
  ];

  for (let i = 0; i < poData.length; i++) {
    const po = poData[i];
    const vendor = createdVendors[po.vendorIndex];
    const poId = `PO${String(i + 1).padStart(3, '0')}`;
    
    const deliveredDate = po.status === 'Delivered' ? '2024-03-10' : null;
    const orderedDate = po.status !== 'Draft' ? '2024-02-15' : '2024-03-01';

    await PurchaseOrderM.findOneAndUpdate(
      { id: poId },
      {
        $set: {
          id: poId,
          vendorId: vendor._id,
          vendorName: vendor.name,
          items: po.items,
          totalAmount: po.totalAmount,
          status: po.status,
          orderedDate,
          expectedDate: po.expectedDate,
          deliveredDate,
          isActive: true,
          tenantId: null,
        },
      },
      { upsert: true },
    );
    console.log(`Created/Updated PO: ${poId} - ${vendor.name}`);
  }

  // Ensure indexes
  await UserM.syncIndexes();
  await TenantM.syncIndexes();
  await VendorM.syncIndexes();
  await PurchaseOrderM.syncIndexes();

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
