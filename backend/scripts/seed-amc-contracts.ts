import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Model } from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { AmcContract, AmcContractSchema } from '../src/modules/service-amc/schemas/amc-contract.schema';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';

// Load .env from parent directory (backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type AmcContractModel = Model<AmcContract>;
type TenantModel = Model<Tenant>;

// AMC Contract data
const AMC_CONTRACTS_DATA = [
  {
    contractId: 'AMC001',
    customer: 'Ramesh Joshi',
    site: 'GIDC Ahmedabad',
    systemSize: 50,
    startDate: '2026-03-15',
    endDate: '2027-03-15',
    status: 'Active',
    nextVisit: '2026-04-15',
    amount: 15000,
  },
  {
    contractId: 'AMC002',
    customer: 'Suresh Bhatt',
    site: 'Vapi GIDC',
    systemSize: 150,
    startDate: '2026-03-30',
    endDate: '2027-03-30',
    status: 'Active',
    nextVisit: '2026-04-30',
    amount: 45000,
  },
  {
    contractId: 'AMC003',
    customer: 'Prakash Agarwal',
    site: 'Ahmedabad Plant',
    systemSize: 80,
    startDate: '2026-01-15',
    endDate: '2027-01-15',
    status: 'Active',
    nextVisit: '2026-02-15',
    amount: 24000,
  },
  {
    contractId: 'AMC004',
    customer: 'Dinesh Trivedi',
    site: 'Nadiad Plant',
    systemSize: 55,
    startDate: '2026-03-20',
    endDate: '2027-03-20',
    status: 'Active',
    nextVisit: '2026-04-20',
    amount: 16500,
  },
  {
    contractId: 'AMC005',
    customer: 'Meena Patel',
    site: 'Morbi Factory',
    systemSize: 40,
    startDate: '2026-04-05',
    endDate: '2027-04-05',
    status: 'Pending',
    nextVisit: '2026-05-05',
    amount: 12000,
  },
  {
    contractId: 'AMC006',
    customer: 'Nilesh Parekh',
    site: 'Morbi Ceramic Belt',
    systemSize: 150,
    startDate: '2026-04-10',
    endDate: '2027-04-10',
    status: 'Pending',
    nextVisit: '2026-05-10',
    amount: 45000,
  },
  {
    contractId: 'AMC007',
    customer: 'Harish Mehta',
    site: 'Anand Dairy',
    systemSize: 30,
    startDate: '2026-04-01',
    endDate: '2027-04-01',
    status: 'Pending',
    nextVisit: '2026-05-01',
    amount: 9000,
  },
  {
    contractId: 'AMC008',
    customer: 'Deepika Shah',
    site: 'Shah Motors Vadodara',
    systemSize: 75,
    startDate: '2026-02-28',
    endDate: '2027-02-28',
    status: 'Active',
    nextVisit: '2026-03-28',
    amount: 22500,
  },
];

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in .env');
  }

  await mongoose.connect(mongoUri);

  const TenantM: TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const AmcContractM: AmcContractModel = mongoose.model(AmcContract.name, AmcContractSchema);

  // Get the tenant
  const tenantCode = 'solarcorp';
  const tenant = await TenantM.findOne({ code: tenantCode });

  if (!tenant) {
    throw new Error(`Tenant ${tenantCode} not found. Run the main seed.ts first.`);
  }

  console.log(`Seeding AMC contracts for tenant: ${tenant.name}`);

  // Seed AMC contracts
  for (const contractData of AMC_CONTRACTS_DATA) {
    const existing = await AmcContractM.findOne({
      tenantId: tenant._id,
      contractId: contractData.contractId,
    });

    if (existing) {
      console.log(`  Updating AMC contract: ${contractData.contractId} - ${contractData.customer}`);
      await AmcContractM.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...contractData,
            tenantId: tenant._id,
          },
        },
      );
    } else {
      console.log(`  Creating AMC contract: ${contractData.contractId} - ${contractData.customer}`);
      await AmcContractM.create({
        ...contractData,
        tenantId: tenant._id,
        isDeleted: false,
      });
    }
  }

  // Ensure indexes are created (skip if conflict)
  try {
    await AmcContractM.syncIndexes();
  } catch (err) {
    console.log('  Note: Index sync skipped (collection may already exist)');
  }

  console.log(`\n✅ Successfully seeded ${AMC_CONTRACTS_DATA.length} AMC contracts`);

  await mongoose.disconnect();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
