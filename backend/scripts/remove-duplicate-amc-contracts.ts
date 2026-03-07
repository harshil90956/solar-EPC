/**
 * Script to remove duplicate AMC contracts from database
 * Keeps only one contract per customer-site combination
 * Run with: npx ts-node backend/scripts/remove-duplicate-amc-contracts.ts
 */

import { NestFactory } from '@nestjs/core';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';
import { AmcContract, AmcContractDocument } from '../src/modules/service-amc/schemas/amc-contract.schema';

async function removeDuplicateContracts() {
  console.log('Starting duplicate AMC contracts removal...');
  
  const app = await NestFactory.create(AppModule);
  const amcContractModel = app.get<Model<AmcContractDocument>>(getModelToken(AmcContract.name));
  
  // Get all AMC contracts (not soft-deleted)
  const contracts = await amcContractModel
    .find({ isDeleted: { $ne: true } })
    .sort({ createdAt: 1 }) // Keep oldest contracts
    .lean()
    .exec();
  
  console.log(`Found ${contracts.length} total contracts`);
  
  // Group contracts by customer-site combination
  const grouped = new Map<string, any[]>();
  
  for (const contract of contracts) {
    const key = `${contract.customer?.toLowerCase()?.trim()}-${contract.site?.toLowerCase()?.trim()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(contract);
  }
  
  console.log(`Found ${grouped.size} unique customer-site combinations`);
  
  const toDelete: string[] = [];
  
  for (const [key, group] of grouped) {
    if (group.length > 1) {
      console.log(`\nDuplicate found for "${key}": ${group.length} contracts`);
      
      // Keep the first one (oldest), mark rest for deletion
      const keep = group[0];
      console.log(`  Keeping: ${keep.contractId}`);
      
      for (let i = 1; i < group.length; i++) {
        const remove = group[i];
        console.log(`  Deleting: ${remove.contractId}`);
        toDelete.push(remove._id.toString());
      }
    }
  }
  
  // Delete duplicates
  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} duplicate contracts...`);
    
    const result = await amcContractModel.deleteMany({
      _id: { $in: toDelete.map(id => new Types.ObjectId(id)) }
    });
    
    console.log(`Deleted ${result.deletedCount} duplicate contracts`);
  } else {
    console.log('\nNo duplicates found!');
  }
  
  // Show remaining contracts
  const remaining = await amcContractModel
    .find({ isDeleted: { $ne: true } })
    .sort({ customer: 1, site: 1 })
    .lean()
    .exec();
  
  console.log(`\nRemaining ${remaining.length} contracts:`);
  for (const c of remaining) {
    console.log(`  - ${c.contractId}: ${c.customer} @ ${c.site}`);
  }
  
  await app.close();
  console.log('\nDone!');
}

removeDuplicateContracts().catch(console.error);
