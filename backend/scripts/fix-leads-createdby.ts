import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Lead } from '../src/modules/leads/schemas/lead.schema';
import { User } from '../src/core/auth/schemas/user.schema';

/**
 * Script to fix missing createdBy field in leads
 * Assigns createdBy based on tenant's first admin user as a placeholder
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const leadModel = app.get<Model<Lead>>(getModelToken(Lead.name));
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    
    console.log('\n🔧 Starting migration to fix missing createdBy fields...\n');
    
    // Get all leads without createdBy
    const leadsWithoutCreatedBy = await leadModel.find({
      $or: [
        { createdBy: null },
        { createdBy: { $exists: false } }
      ]
    }).exec();
    
    console.log(`📊 Found ${leadsWithoutCreatedBy.length} leads without createdBy\n`);
    
    if (leadsWithoutCreatedBy.length === 0) {
      console.log('✅ All leads already have createdBy field');
      return;
    }
    
    // For each tenant, find an admin user to assign as creator
    const tenantAdminMap = new Map<string, Types.ObjectId>();
    
    // Group leads by tenant
    const leadsByTenant = new Map<string, any[]>();
    leadsWithoutCreatedBy.forEach((lead: any) => {
      const tenantIdStr = lead.tenantId?.toString();
      if (tenantIdStr) {
        if (!leadsByTenant.has(tenantIdStr)) {
          leadsByTenant.set(tenantIdStr, []);
        }
        leadsByTenant.get(tenantIdStr)!.push(lead);
      }
    });
    
    console.log(`📁 Leads grouped by ${leadsByTenant.size} tenants\n`);
    
    let totalUpdated = 0;
    
    // Process each tenant
    for (const [tenantIdStr, leads] of leadsByTenant.entries()) {
      try {
        // Find admin user for this tenant
        let adminUserId = tenantAdminMap.get(tenantIdStr);
        
        if (!adminUserId) {
          const adminUser = await userModel.findOne({
            tenantId: new Types.ObjectId(tenantIdStr),
            role: { $in: ['Admin', 'admin'] }
          }).lean();
          
          if (adminUser) {
            adminUserId = adminUser._id;
            tenantAdminMap.set(tenantIdStr, adminUserId!);
            console.log(`  Tenant ${tenantIdStr}: Using admin ${adminUser.email} (${adminUserId})`);
          } else {
            console.log(`  ⚠️  Tenant ${tenantIdStr}: No admin user found, skipping ${leads.length} leads`);
            continue;
          }
        }
        
        // Update all leads for this tenant
        const result = await leadModel.updateMany(
          {
            _id: { $in: leads.map(l => l._id) }
          },
          {
            $set: { 
              createdBy: adminUserId,
              lastContact: new Date(),
              $addToSet: {
                activities: {
                  type: 'migration',
                  ts: new Date().toISOString(),
                  note: 'createdBy field added via migration script',
                  by: 'SYSTEM_MIGRATION',
                  timestamp: new Date()
                }
              }
            }
          }
        );
        
        console.log(`    ✅ Updated ${result.modifiedCount} leads`);
        totalUpdated += result.modifiedCount;
        
      } catch (error: any) {
        console.error(`  ❌ Error processing tenant ${tenantIdStr}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Migration complete! Updated ${totalUpdated} leads\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
