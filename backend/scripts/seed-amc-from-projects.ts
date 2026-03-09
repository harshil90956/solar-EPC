import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Model, Types } from 'mongoose';
import { AmcContract, AmcContractSchema } from '../src/modules/service-amc/schemas/amc-contract.schema';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';
import { Project, ProjectSchema } from '../src/modules/projects/schemas/project.schema';

// Load .env from parent directory (backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type AmcContractModel = Model<AmcContract>;
type TenantModel = Model<Tenant>;
type ProjectModel = Model<Project>;

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in .env');
  }

  await mongoose.connect(mongoUri);

  const TenantM: TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const ProjectM: ProjectModel = mongoose.model(Project.name, ProjectSchema);
  const AmcContractM: AmcContractModel = mongoose.model(AmcContract.name, AmcContractSchema);

  // Get the tenant
  const tenantCode = 'solarcorp';
  const tenant = await TenantM.findOne({ code: tenantCode });

  if (!tenant) {
    throw new Error(`Tenant ${tenantCode} not found. Run the main seed.ts first.`);
  }

  console.log(`Seeding AMC contracts for tenant: ${tenant.name}`);

  // Find all commissioned projects (progress = 100, not deleted)
  const projectFilter: any = { progress: 100, isDeleted: false };
  projectFilter.tenantId = tenant._id;

  const commissionedProjects = await ProjectM
    .find(projectFilter)
    .select('_id projectId customerName site systemSize startDate value tenantId pm')
    .lean()
    .exec();

  console.log(`Found ${commissionedProjects.length} commissioned projects`);

  if (commissionedProjects.length === 0) {
    console.log('No commissioned projects found. Cannot create AMC contracts.');
    await mongoose.disconnect();
    return;
  }

  // Find existing AMC contracts
  const existingContracts = await AmcContractM
    .find({ tenantId: tenant._id, isDeleted: { $ne: true } })
    .select('customer site contractId')
    .lean()
    .exec();

  const existingKeys = new Set(
    existingContracts.map(c => `${c.customer?.toLowerCase()?.trim()}-${c.site?.toLowerCase()?.trim()}`)
  );

  console.log(`Found ${existingContracts.length} existing AMC contracts`);

  let createdCount = 0;

  for (const project of commissionedProjects) {
    const key = `${project.customerName?.toLowerCase()?.trim()}-${project.site?.toLowerCase()?.trim()}`;
    
    // Skip if AMC already exists for this customer+site
    if (existingKeys.has(key)) {
      console.log(`  Skipping: AMC already exists for ${project.customerName} - ${project.site}`);
      continue;
    }

    // Calculate AMC dates (1 year contract, first visit after 3 months)
    const startDate = project.startDate || new Date().toISOString().split('T')[0];
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    const nextVisit = new Date(start);
    nextVisit.setMonth(nextVisit.getMonth() + 3);

    // Calculate AMC amount (2% of project value or minimum 5000)
    const amount = project.value ? Math.max(project.value * 0.02, 5000) : 5000;

    // Use project.pm (Project Manager) as employee if available
    const employee = project.pm || 'Unassigned';

    const contractData: any = {
      contractId: `AMC${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 1000)}`,
      customer: project.customerName,
      employee: employee,
      site: project.site,
      systemSize: project.systemSize || 0,
      startDate: startDate,
      endDate: endDate.toISOString().split('T')[0],
      status: 'Active',
      nextVisit: nextVisit.toISOString().split('T')[0],
      amount: Math.round(amount),
      tenantId: tenant._id,
      isDeleted: false,
    };

    try {
      await AmcContractM.create(contractData);
      console.log(`  Created AMC contract: ${contractData.contractId} - ${contractData.customer} (${employee})`);
      createdCount++;
      
      // Add to existingKeys to prevent duplicates
      existingKeys.add(key);
    } catch (err: any) {
      console.error(`  Error creating AMC contract for ${project.customerName}:`, err.message);
    }
  }

  console.log(`\n✅ Successfully created ${createdCount} AMC contracts from ${commissionedProjects.length} commissioned projects`);
  console.log(`   Existing contracts: ${existingContracts.length}`);
  console.log(`   Total contracts now: ${existingContracts.length + createdCount}`);

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
