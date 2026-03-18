/**
 * Migration: Migrate HRM permissions from old schema to new role_module_permissions format
 * 
 * Old: hrm_permissions collection
 *   { roleId: 'Admin', permissions: { employees: { view: true, manage: true } } }
 * 
 * New: role_module_permissions collection
 *   { roleId: 'Admin', module: 'employees', actions: { view: true, create: true, ... }, dataScope: 'ALL' }
 * 
 * Usage:
 *   cd backend
 *   node migrations/migrate-hrm-permissions.js
 */

const mongoose = require('mongoose');

async function migrateHrmPermissions() {
  const uri = 'mongodb+srv://gajeraakshit53_db_user:lvbGcIFW0ul5Bao6@akshit.thyfwea.mongodb.net/solar?retryWrites=true&w=majority';
  
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const oldCollection = db.collection('hrm_permissions');
  const newCollection = db.collection('role_module_permissions');

  // Get all old permissions
  const oldPerms = await oldCollection.find({}).toArray();
  console.log(`📊 Found ${oldPerms.length} old permission records`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const perm of oldPerms) {
    try {
      const { roleId, permissions, tenantId } = perm;
      
      if (!permissions || typeof permissions !== 'object') {
        console.log(`⚠️  Skipping ${roleId}: Invalid permissions structure`);
        skipped++;
        continue;
      }

      // Map old modules to new format
      const modules = ['employees', 'leaves', 'attendance', 'payroll', 'increments', 'departments'];
      
      for (const module of modules) {
        const oldModulePerms = permissions[module];
        if (!oldModulePerms) continue;

        // Map old actions to new actions
        const newActions = {
          view: false,
          create: false,
          edit: false,
          delete: false,
          export: false,
          assign: false,
          approve: false,
          reject: false,
          checkin: false,
          checkout: false,
          apply: false,
          generate: false,
          mark: false,
        };

        let dataScope = 'OWN';

        // Map based on module type
        if (module === 'employees') {
          newActions.view = oldModulePerms.view || false;
          newActions.create = oldModulePerms.manage || false;
          newActions.edit = oldModulePerms.manage || false;
          newActions.delete = oldModulePerms.delete || false;
          dataScope = oldModulePerms.manage ? 'ALL' : 'OWN';
        } else if (module === 'leaves') {
          newActions.view = oldModulePerms.view || false;
          newActions.apply = oldModulePerms.apply || false;
          newActions.approve = oldModulePerms.approve || false;
          newActions.reject = oldModulePerms.approve || false; // Map approve to reject too
          dataScope = oldModulePerms.approve ? 'ALL' : 'OWN';
        } else if (module === 'attendance') {
          newActions.view = oldModulePerms.view_all || oldModulePerms.view_self || false;
          newActions.checkin = oldModulePerms.checkin_checkout || false;
          newActions.checkout = oldModulePerms.checkin_checkout || false;
          newActions.mark = oldModulePerms.manage || false;
          newActions.edit = oldModulePerms.manage || false;
          newActions.delete = oldModulePerms.manage || false;
          dataScope = oldModulePerms.view_all ? 'ALL' : 'OWN';
        } else if (module === 'payroll') {
          newActions.view = oldModulePerms.view || false;
          newActions.generate = oldModulePerms.manage || false;
          newActions.edit = oldModulePerms.manage || false;
          newActions.delete = oldModulePerms.manage || false;
          newActions.approve = oldModulePerms.approve || false;
          dataScope = oldModulePerms.manage ? 'ALL' : 'OWN';
        } else if (module === 'increments') {
          newActions.view = oldModulePerms.view || false;
          newActions.create = oldModulePerms.manage || false;
          newActions.edit = oldModulePerms.manage || false;
          newActions.delete = oldModulePerms.manage || false;
          dataScope = oldModulePerms.manage ? 'ALL' : 'OWN';
        } else if (module === 'departments') {
          newActions.view = oldModulePerms.view || false;
          newActions.create = oldModulePerms.manage || false;
          newActions.edit = oldModulePerms.manage || false;
          newActions.delete = oldModulePerms.manage || false;
          newActions.assign = oldModulePerms.manage || false;
          dataScope = oldModulePerms.manage ? 'ALL' : 'OWN';
        }

        // Check if this module has any permissions
        const hasAnyPermission = Object.values(newActions).some(v => v === true);
        if (!hasAnyPermission) continue;

        // Insert into new collection
        const query = { 
          roleId, 
          module,
          ...(tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {})
        };

        const update = {
          $set: {
            roleId,
            module,
            actions: newActions,
            dataScope,
            ...(tenantId ? { tenantId: new mongoose.Types.ObjectId(tenantId) } : {})
          }
        };

        await newCollection.updateOne(query, update, { upsert: true });
        migrated++;
        console.log(`✅ Migrated ${roleId} → ${module}`);
      }
    } catch (error) {
      console.error(`❌ Error migrating ${perm.roleId}:`, error.message);
      errors++;
      skipped++;
    }
  }

  console.log(`\n🎉 Migration Complete!`);
  console.log(`   ✅ Migrated: ${migrated} records`);
  console.log(`   ⚠️  Skipped: ${skipped} records`);
  console.log(`   ❌ Errors: ${errors} records`);
  
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  console.log('\n💡 Next steps:');
  console.log('   1. Clear browser cache and localStorage');
  console.log('   2. Re-login to refresh user permissions');
  console.log('   3. Run debugHrmPermissions() in browser console to verify');
}

// Run migration
migrateHrmPermissions().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
