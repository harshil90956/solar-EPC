import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Model } from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { LeadStatus, LeadStatusSchema, StatusType } from '../src/modules/settings/schemas/lead-status.schema';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';

// Load .env from parent directory (backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type LeadStatusModel = Model<LeadStatus>;
type TenantModel = Model<Tenant>;

// All lead statuses that exist in the database (from your data)
const LEAD_STATUSES = [
  { key: 'new', label: 'New', color: '#64748b', type: StatusType.START, order: 0 },
  { key: 'contacted', label: 'Contacted', color: '#3b82f6', type: StatusType.NORMAL, order: 1 },
  { key: 'qualified', label: 'Qualified', color: '#8b5cf6', type: StatusType.NORMAL, order: 2 },
  { key: 'survey', label: 'Site Survey', color: '#06b6d4', type: StatusType.NORMAL, order: 3 },
  { key: 'proposal', label: 'Proposal Sent', color: '#f59e0b', type: StatusType.NORMAL, order: 4 },
  { key: 'negotiation', label: 'Negotiation', color: '#ec4899', type: StatusType.NORMAL, order: 5 },
  { key: 'walk-in', label: 'Walk-in', color: '#14b8a6', type: StatusType.NORMAL, order: 6 },
  { key: 'won', label: 'Won', color: '#22c55e', type: StatusType.SUCCESS, order: 7 },
  { key: 'lost', label: 'Lost', color: '#ef4444', type: StatusType.FAILURE, order: 8 },
];

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in .env');
  }

  await mongoose.connect(mongoUri);

  const TenantM: TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const LeadStatusM: LeadStatusModel = mongoose.model(LeadStatus.name, LeadStatusSchema);

  // Get the tenant
  const tenantCode = 'solarcorp';
  const tenant = await TenantM.findOne({ code: tenantCode });

  if (!tenant) {
    throw new Error(`Tenant ${tenantCode} not found. Run the main seed.ts first.`);
  }

  console.log(`Seeding lead statuses for tenant: ${tenant.name}`);

  let created = 0;
  let skipped = 0;

  for (const statusData of LEAD_STATUSES) {
    try {
      // Check if status already exists
      const existing = await LeadStatusM.findOne({
        tenantId: tenant._id,
        entity: 'lead',
        key: statusData.key,
      });

      if (existing) {
        // Update existing status with latest values
        await LeadStatusM.updateOne(
          { _id: existing._id },
          {
            $set: {
              label: statusData.label,
              color: statusData.color,
              type: statusData.type,
              order: statusData.order,
              isActive: true,
              isSystem: true,
            },
          }
        );
        console.log(`  Updated status: ${statusData.key} - ${statusData.label}`);
        skipped++;
      } else {
        // Create new status
        await LeadStatusM.create({
          tenantId: tenant._id,
          module: 'crm',
          entity: 'lead',
          key: statusData.key,
          label: statusData.label,
          color: statusData.color,
          type: statusData.type,
          order: statusData.order,
          isActive: true,
          isSystem: true,
        });
        console.log(`  Created status: ${statusData.key} - ${statusData.label}`);
        created++;
      }
    } catch (err) {
      console.error(`  Failed to create/update status ${statusData.key}:`, err);
    }
  }

  // Ensure indexes are created
  await LeadStatusM.syncIndexes();

  console.log(`\n✅ Successfully seeded lead statuses`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${skipped}`);

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
