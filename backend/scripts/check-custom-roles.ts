import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { CustomRole } from '../src/modules/settings/schemas/custom-role.schema';

/**
 * Script to check and sync custom role permissions
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const customRoleModel = app.get<Model<CustomRole>>(getModelToken(CustomRole.name));
    
    // Check what roles exist
    const allRoles = await customRoleModel.find({}).exec();
    console.log('\n📋 All Custom Roles in Database:');
    allRoles.forEach(role => {
      console.log(`   - ${role.roleId}: ${role.label}`);
    });
    
    // Check the specific role that's being used
    const targetRoleId = 'custom_1773119661334';
    const targetRole = await customRoleModel.findOne({ roleId: targetRoleId }).exec();
    
    if (!targetRole) {
      console.log(`\n❌ Role "${targetRoleId}" NOT FOUND in database!`);
      console.log(`💡 This is why modules aren't showing in sidebar`);
      
      // Find the closest matching role (e.g., "manager")
      const managerRole = await customRoleModel.findOne({ 
        roleId: { $regex: 'manager', $options: 'i' } 
      }).exec();
      
      if (managerRole) {
        console.log(`\n✅ Found similar role: ${managerRole.roleId} (${managerRole.label})`);
        console.log(`💡 Update employee to use this role ID instead`);
      }
    } else {
      console.log(`\n✅ Found role: ${targetRole.roleId} (${targetRole.label})`);
      
      // Log current permissions structure
      console.log('\n📊 Current permissions structure:');
      const permsObj: any = targetRole.permissions instanceof Map 
        ? Object.fromEntries(Array.from(targetRole.permissions.entries()).map(([k, v]) => [k, v instanceof Map ? Object.fromEntries(v.entries()) : v]))
        : targetRole.permissions;
      console.log(JSON.stringify(permsObj, null, 2));
      
      // Ensure view=true for all modules
      const modules = ['crm', 'survey', 'inventory', 'hrm', 'installation', 'project', 'finance'];
      let updated = false;
      
      modules.forEach(moduleId => {
        // Convert permissions to plain object for easier manipulation
        const currentPermsObj: any = targetRole.permissions instanceof Map 
          ? Object.fromEntries(Array.from(targetRole.permissions.entries()).map(([k, v]) => [k, v instanceof Map ? Object.fromEntries(v.entries()) : v]))
          : targetRole.permissions;
        
        if (!currentPermsObj[moduleId]) {
          currentPermsObj[moduleId] = {};
        }
        
        const perms: any = currentPermsObj[moduleId];
        if (perms && perms.view !== true) {
          perms.view = true;
          updated = true;
          console.log(`  ✅ Set view=true for module: ${moduleId}`);
        } else if (perms && perms.view === true) {
          console.log(`  ✓ Already has view=true for module: ${moduleId}`);
        }
        
        // Update back to the map
        targetRole.permissions.set(moduleId, new Map(Object.entries(currentPermsObj[moduleId])));
      });
      
      if (updated) {
        await targetRole.save();
        console.log('\n✅ Updated role with view=true for all modules');
      } else {
        console.log('\n✓ All modules already have view=true');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
