import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Model } from 'mongoose';
import { SchemaFactory } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../src/modules/projects/schemas/project.schema';
import { Tenant, TenantSchema } from '../src/core/tenant/schemas/tenant.schema';

// Load .env from parent directory (backend/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

type ProjectModel = Model<Project>;
type TenantModel = Model<Tenant>;

// Project data from frontend mockData.js
const PROJECTS_DATA = [
  {
    projectId: 'P001',
    quotationId: 'Q001',
    customerName: 'Ramesh Joshi',
    site: 'GIDC Ahmedabad',
    systemSize: 50,
    status: 'Installation',
    pm: 'Neha Gupta',
    startDate: '2026-02-25',
    estEndDate: '2026-03-15',
    progress: 60,
    value: 280000,
    milestones: [
      { name: 'Material Ready', status: 'Done', date: '2026-02-27' },
      { name: 'Installation', status: 'In Progress', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
  {
    projectId: 'P002',
    quotationId: null,
    customerName: 'Suresh Bhatt',
    site: 'Vapi GIDC',
    systemSize: 150,
    status: 'Design',
    pm: 'Neha Gupta',
    startDate: '2026-02-20',
    estEndDate: '2026-03-30',
    progress: 20,
    value: 840000,
    milestones: [
      { name: 'Material Ready', status: 'Pending', date: null },
      { name: 'Installation', status: 'Pending', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
  {
    projectId: 'P003',
    quotationId: null,
    customerName: 'Prakash Agarwal',
    site: 'Ahmedabad Plant',
    systemSize: 80,
    status: 'Commissioned',
    pm: 'Neha Gupta',
    startDate: '2025-12-01',
    estEndDate: '2026-01-15',
    progress: 100,
    value: 448000,
    milestones: [
      { name: 'Material Ready', status: 'Done', date: '2025-12-10' },
      { name: 'Installation', status: 'Done', date: '2025-12-28' },
      { name: 'Commission', status: 'Done', date: '2026-01-10' },
      { name: 'Billing', status: 'Done', date: '2026-01-12' },
      { name: 'Closure', status: 'Done', date: '2026-01-15' },
    ],
  },
  {
    projectId: 'P004',
    quotationId: null,
    customerName: 'Dinesh Trivedi',
    site: 'Nadiad Plant',
    systemSize: 55,
    status: 'Procurement',
    pm: 'Neha Gupta',
    startDate: '2026-02-10',
    estEndDate: '2026-03-20',
    progress: 35,
    value: 308000,
    milestones: [
      { name: 'Material Ready', status: 'In Progress', date: null },
      { name: 'Installation', status: 'Pending', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
  {
    projectId: 'P005',
    quotationId: null,
    customerName: 'Meena Patel',
    site: 'Morbi Factory',
    systemSize: 40,
    status: 'Survey',
    pm: 'Neha Gupta',
    startDate: '2026-02-22',
    estEndDate: '2026-04-05',
    progress: 10,
    value: 224000,
    milestones: [
      { name: 'Material Ready', status: 'Pending', date: null },
      { name: 'Installation', status: 'Pending', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
  {
    projectId: 'P006',
    quotationId: null,
    customerName: 'Nilesh Parekh',
    site: 'Morbi Ceramic Belt',
    systemSize: 150,
    status: 'Design',
    pm: 'Neha Gupta',
    startDate: '2026-02-15',
    estEndDate: '2026-04-10',
    progress: 18,
    value: 840000,
    milestones: [
      { name: 'Material Ready', status: 'Pending', date: null },
      { name: 'Installation', status: 'Pending', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
  {
    projectId: 'P007',
    quotationId: null,
    customerName: 'Harish Mehta',
    site: 'Anand Dairy',
    systemSize: 30,
    status: 'Quotation',
    pm: 'Neha Gupta',
    startDate: '2026-02-26',
    estEndDate: '2026-04-01',
    progress: 8,
    value: 168000,
    milestones: [
      { name: 'Material Ready', status: 'Pending', date: null },
      { name: 'Installation', status: 'Pending', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
  {
    projectId: 'P008',
    quotationId: null,
    customerName: 'Deepika Shah',
    site: 'Shah Motors Vadodara',
    systemSize: 75,
    status: 'On Hold',
    pm: 'Neha Gupta',
    startDate: '2026-01-20',
    estEndDate: null,
    progress: 45,
    value: 420000,
    milestones: [
      { name: 'Material Ready', status: 'Done', date: '2026-01-28' },
      { name: 'Installation', status: 'Pending', date: null },
      { name: 'Commission', status: 'Pending', date: null },
      { name: 'Billing', status: 'Pending', date: null },
      { name: 'Closure', status: 'Pending', date: null },
    ],
  },
];

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in .env');
  }

  await mongoose.connect(mongoUri);

  const TenantM: TenantModel = mongoose.model(Tenant.name, TenantSchema);
  const ProjectM: ProjectModel = mongoose.model(Project.name, ProjectSchema);

  // Get the tenant
  const tenantCode = 'solarcorp';
  const tenant = await TenantM.findOne({ code: tenantCode });

  if (!tenant) {
    throw new Error(`Tenant ${tenantCode} not found. Run the main seed.ts first.`);
  }

  console.log(`Seeding projects for tenant: ${tenant.name}`);

  // Seed projects
  for (const projectData of PROJECTS_DATA) {
    const existing = await ProjectM.findOne({
      tenantId: tenant._id,
      projectId: projectData.projectId,
    });

    if (existing) {
      console.log(`  Updating project: ${projectData.projectId} - ${projectData.customerName}`);
      await ProjectM.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...projectData,
            tenantId: tenant._id,
          },
        },
      );
    } else {
      console.log(`  Creating project: ${projectData.projectId} - ${projectData.customerName}`);
      await ProjectM.create({
        ...projectData,
        tenantId: tenant._id,
        isDeleted: false,
      });
    }
  }

  // Ensure indexes are created
  await ProjectM.syncIndexes();

  console.log(`\n✅ Successfully seeded ${PROJECTS_DATA.length} projects`);

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
