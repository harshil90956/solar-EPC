import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { INestApplicationContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { RBACConfig } from '../src/modules/settings/schemas/rbac-config.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const rbacConfigModel = app.get<Model<RBACConfig>>('RBAC_CONFIG_MODEL');
    
    // Find all Admin role configs for CRM module
    const adminCrmConfigs = await rbacConfigModel.find({
      roleId: 'Admin',
      moduleId: 'crm',
    }).exec();
    
    console.log(`Found ${adminCrmConfigs.length} Admin CRM configs`);
    
    for (const config of adminCrmConfigs) {
      console.log(`\nUpdating config for tenant: ${config.tenantId}`);
      console.log(`Current permissions:`, Object.fromEntries(config.permissions));
      
      // Update view permission to true
      config.permissions.set('view', true);
      
      // Optionally update other CRM permissions for Admin
      const defaultAdminPermissions = {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
        assign: true,
      };
      
      // Merge with existing permissions
      for (const [action, value] of Object.entries(defaultAdminPermissions)) {
        config.permissions.set(action, value);
      }
      
      await config.save();
      console.log(`Updated permissions:`, Object.fromEntries(config.permissions));
    }
    
    if (adminCrmConfigs.length === 0) {
      console.log('No Admin CRM configs found. Creating default...');
      
      // Create new config for default tenant (if needed)
      const newConfig = await rbacConfigModel.create({
        roleId: 'Admin',
        moduleId: 'crm',
        permissions: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          export: true,
          assign: true,
        },
      });
      
      console.log('Created new Admin CRM config:', newConfig);
    }
    
    console.log('\n✅ Admin CRM permissions updated successfully!');
  } catch (error) {
    console.error('❌ Error updating permissions:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
