import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { CustomRole } from '../src/modules/settings/schemas/custom-role.schema';

/**
 * Script to fix custom role permissions
 * Updates custom_1773119661334 to have view=true for survey, hrm, and other modules
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const customRoleModel = app.get<Model<CustomRole>>(getModelToken(CustomRole.name));
    
    // Find the custom role by ID
    const roleId = 'custom_1773119661334';
    const role = await customRoleModel.findOne({ roleId }).exec();
    
    if (!role) {
      console.error(`❌ Custom role "${roleId}" not found!`);
      return;
    }
    
    console.log(`\n📋 Found Role: ${role.label}`);
    console.log(`   Data Scope: ${role.dataScope}`);
    console.log(`   Base Role: ${role.baseRole}`);
    
    // Define which modules should have view=true
    const modulesToUpdate = [
      'survey',
      'hrm',
      'crm',
      'inventory',
      'installation',
      'commissioning',
      'projects',
      'finance',
      'dashboard',
      'compliance',
      'tickets',
      'estimates',
      'procurement',
      'amc',
    ];
    
    console.log(`\n🔧 Updating permissions for modules: ${modulesToUpdate.join(', ')}`);
    
    // Update each module's permissions
    for (const moduleId of modulesToUpdate) {
      if (!role.permissions.has(moduleId)) {
        role.permissions.set(moduleId, new Map());
      }
      
      const modulePerms = role.permissions.get(moduleId);
      
      if (modulePerms) {
        // Set view=true for all modules
        modulePerms.set('view', true);
        
        // Optionally set other permissions to true as well
        modulePerms.set('create', true);
        modulePerms.set('edit', true);
        modulePerms.set('delete', false); // Keep delete restricted
        modulePerms.set('export', true);
        
        role.permissions.set(moduleId, modulePerms);
      }
    }
    
    // Also set dataScope to ALL if you want to see all records
    role.dataScope = 'ALL';
    
    await role.save();
    
    console.log('\n✅ Custom role permissions updated successfully!\n');
    console.log('📊 Updated Permissions:');
    for (const moduleId of modulesToUpdate) {
      const perms = role.permissions.get(moduleId);
      if (perms) {
        console.log(`   ${moduleId}: view=${perms.get('view')}, create=${perms.get('create')}, edit=${perms.get('edit')}`);
      }
    }
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Logout and login again to get new JWT token`);
    console.log(`   2. Refresh the page`);
    console.log(`   3. Modules should now appear in sidebar\n`);
    
  } catch (error) {
    console.error('❌ Error updating custom role:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
