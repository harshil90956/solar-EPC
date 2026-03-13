import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Lead } from '../src/modules/leads/schemas/lead.schema';

/**
 * Script to inspect latest leads in database
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const leadModel = app.get<Model<Lead>>(getModelToken(Lead.name));
    
    // Get latest 5 leads
    const latestLeads = await leadModel.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec();
    
    console.log('\n📋 Latest Leads in Database:\n');
    latestLeads.forEach((lead: any, index) => {
      console.log(`${index + 1}. Lead: ${lead.name || 'Unnamed'}`);
      console.log(`   ID: ${lead._id}`);
      console.log(`   leadId: ${lead.leadId}`);
      console.log(`   tenantId: ${lead.tenantId}`);
      console.log(`   createdBy: ${lead.createdBy}`);
      console.log(`   assignedTo: ${lead.assignedTo || 'null'}`);
      console.log(`   statusKey: ${lead.statusKey || lead.status}`);
      console.log('');
    });
    
    // Check for leads with missing fields
    console.log('\n🔍 Checking for data integrity issues:\n');
    
    const totalLeads = await leadModel.countDocuments({});
    const leadsWithoutTenant = await leadModel.countDocuments({ 
      $or: [{ tenantId: null }, { tenantId: { $exists: false } }] 
    });
    const leadsWithoutCreatedBy = await leadModel.countDocuments({ 
      $or: [{ createdBy: null }, { createdBy: { $exists: false } }] 
    });
    const unassignedLeads = await leadModel.countDocuments({ 
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] 
    });
    
    console.log(`   Total leads: ${totalLeads}`);
    console.log(`   Leads without tenantId: ${leadsWithoutTenant}`);
    console.log(`   Leads without createdBy: ${leadsWithoutCreatedBy}`);
    console.log(`   Unassigned leads: ${unassignedLeads}`);
    
    if (leadsWithoutTenant > 0 || leadsWithoutCreatedBy > 0) {
      console.log('\n⚠️  WARNING: Some leads have missing required fields!');
    } else {
      console.log('\n✅ All leads have required fields');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
