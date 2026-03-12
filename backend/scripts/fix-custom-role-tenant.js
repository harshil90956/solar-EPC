/**
 * MongoDB Script to Fix Custom Role Tenant ID
 * 
 * This fixes the tenantId mismatch issue where:
 * - JWT token has tenantId: 'default'
 * - Custom roles in DB have tenantId: ObjectId('69a64e1858b24887cc00c518')
 * 
 * Solution: Update custom roles to use tenantId: 'default'
 */

// Connect to MongoDB (update connection string as needed)
// const conn = mongoose.connect('mongodb://localhost:27017/solar-erp');

// Option 1: Update specific custom role to use 'default' tenant
db.customroles.updateMany(
  { roleId: "custom_1773119661334" },
  { 
    $set: { 
      tenantId: "default",
      updatedAt: new Date()
    } 
  }
);

// Option 2: Update ALL custom roles to use 'default' tenant (if you have multiple)
// db.customroles.updateMany(
//   { tenantId: { $exists: true, $ne: "default" } },
//   { $set: { tenantId: "default" } }
// );

// Verify the update
print("\n✅ Updated custom roles:");
db.customroles.find({ roleId: "custom_1773119661334" }).forEach(doc => {
  print(`Role: ${doc.label} (${doc.roleId})`);
  print(`  Tenant ID: ${doc.tenantId}`);
  print(`  Data Scope: ${doc.dataScope}`);
  print(`  Modules with view=true:`);
  
  doc.permissions.forEach((modulePerms, moduleId) => {
    if (modulePerms.get('view') === true) {
      print(`    - ${moduleId}: view=${modulePerms.get('view')}`);
    }
  });
  print("");
});

print("\n💡 Next steps:");
print("1. Logout from the application");
print("2. Login again to get new JWT token");
print("3. Refresh the page - modules should now appear in sidebar");
