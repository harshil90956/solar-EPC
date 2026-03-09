import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import mongoose, { Model, Types } from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';
import { User, UserSchema } from '../src/core/auth/schemas/user.schema';
import { Vendor, VendorSchema } from '../src/modules/procurement/schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../src/modules/procurement/schemas/purchase-order.schema';
import { Item, ItemSchema } from '../src/modules/items/schemas/item.schema';

dotenv.config();

type TenantModel = Model<Tenant>;
type UserModel = Model<User>;
type VendorModel = Model<Vendor>;
type PurchaseOrderModel = Model<PurchaseOrder>;
type ItemModel = Model<Item>;

const VENDORS_SEED = [
  { name: 'Adani Solar', category: 'Panel', contact: 'Rajesh Kumar', phone: '9876543210', email: 'sales@adani-solar.com', city: 'Ahmedabad', rating: 5 },
  { name: 'Tata Power Solar', category: 'Panel', contact: 'Priya Sharma', phone: '9876543211', email: 'contact@tatapowersolar.com', city: 'Mumbai', rating: 4 },
  { name: 'SMA India', category: 'Inverter', contact: 'Anil Verma', phone: '9876543212', email: 'info@sma-india.com', city: 'Bangalore', rating: 5 },
  { name: 'Waaree Energies', category: 'Structure', contact: 'Sunil Patel', phone: '9876543213', email: 'sales@waaree.com', city: 'Surat', rating: 4 },
  { name: 'Havells India', category: 'Cable', contact: 'Vikram Singh', phone: '9876543214', email: 'epc@havells.com', city: 'Delhi', rating: 4 },
];

const ITEMS_SEED = [
  { itemId: 'INV001', description: '400W Mono PERC Solar Panel', category: 'Panel', unit: 'pcs', stock: 500, reserved: 50, minStock: 100, rate: 14500, warehouse: 'WH-Ahmedabad', status: 'In Stock' },
  { itemId: 'INV002', description: '500W Mono PERC Solar Panel', category: 'Panel', unit: 'pcs', stock: 300, reserved: 30, minStock: 50, rate: 16200, warehouse: 'WH-Surat', status: 'In Stock' },
  { itemId: 'INV003', description: '50kW SMA Sunny Central Inverter', category: 'Inverter', unit: 'pcs', stock: 20, reserved: 5, minStock: 5, rate: 850000, warehouse: 'WH-Mumbai', status: 'In Stock' },
  { itemId: 'INV004', description: '25kW Delta Inverter', category: 'Inverter', unit: 'pcs', stock: 15, reserved: 3, minStock: 5, rate: 420000, warehouse: 'WH-Ahmedabad', status: 'In Stock' },
  { itemId: 'INV005', description: '10kW Residential Inverter', category: 'Inverter', unit: 'pcs', stock: 8, reserved: 6, minStock: 10, rate: 95000, warehouse: 'WH-Surat', status: 'Low Stock' },
  { itemId: 'INV006', description: 'Solar Mounting Structure', category: 'Structure', unit: 'sets', stock: 200, reserved: 40, minStock: 50, rate: 18000, warehouse: 'WH-Mumbai', status: 'In Stock' },
  { itemId: 'INV007', description: 'MC4 Connectors (Pack of 10)', category: 'BOS', unit: 'packs', stock: 1000, reserved: 200, minStock: 300, rate: 850, warehouse: 'WH-Ahmedabad', status: 'In Stock' },
  { itemId: 'INV008', description: 'DC Cable 4mm (1 meter)', category: 'Cable', unit: 'm', stock: 5000, reserved: 1000, minStock: 2000, rate: 45, warehouse: 'WH-Surat', status: 'In Stock' },
  { itemId: 'INV009', description: 'AC Cable 6mm (1 meter)', category: 'Cable', unit: 'm', stock: 3000, reserved: 500, minStock: 1000, rate: 62, warehouse: 'WH-Mumbai', status: 'In Stock' },
  { itemId: 'INV010', description: 'Lightning Arrestor', category: 'BOS', unit: 'pcs', stock: 0, reserved: 0, minStock: 20, rate: 3500, warehouse: 'WH-Ahmedabad', status: 'Out of Stock' },
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
  const ItemM: ItemModel = mongoose.model(Item.name, ItemSchema);

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

  // Seed Items (Inventory)
  console.log('Seeding items...');
  for (const itemData of ITEMS_SEED) {
    await ItemM.findOneAndUpdate(
      { itemId: itemData.itemId },
      {
        $set: {
          ...itemData,
          tenantId: tenant._id,
          isDeleted: false,
        },
      },
      { upsert: true, new: true },
    );
    console.log(`Created/Updated item: ${itemData.itemId} - ${itemData.description}`);
  }

  // Ensure indexes
  await UserM.syncIndexes();
  await TenantM.syncIndexes();
  await VendorM.syncIndexes();
  await PurchaseOrderM.syncIndexes();
  await ItemM.syncIndexes();

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
