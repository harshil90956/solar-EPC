// MongoDB Script to Check Custom Roles
// Run this in MongoDB Compass or mongosh

console.log("\n📋 All Custom Roles in Database:\n");
const allRoles = db.customroles.find({}).toArray();
allRoles.forEach(role => {
  console.log(`   - ${role.roleId}: ${role.label}`);
});

// Check the specific role that's being used
const targetRoleId = 'custom_1773119661334';
const targetRole = db.customroles.findOne({ roleId: targetRoleId });

console.log("\n" + "=".repeat(50));
console.log(`\n🔍 Checking role: ${targetRoleId}\n`);

if (!targetRole) {
  console.log(`❌ Role "${targetRoleId}" NOT FOUND in database!`);
  console.log(`💡 This is why modules aren't showing in sidebar\n`);
  
  // Find similar roles
  const managerRole = db.customroles.findOne({ 
    label: { $regex: /manager/i } 
  });
  
  if (managerRole) {
    console.log(`✅ Found similar role:`);
    console.log(`   Role ID: ${managerRole.roleId}`);
    console.log(`   Label: ${managerRole.label}`);
    console.log(`\n💡 Update employee to use this role ID instead:\n`);
    console.log(`   db.employees.updateOne(\n     { _id: ObjectId("69b29ce2cd68667e84c657b2") },\n     { $set: { roleId: "${managerRole.roleId}" } }\n   )\n`);
  }
} else {
  console.log(`✅ Found role: ${targetRole.label}`);
  console.log(`   Data Scope: ${targetRole.dataScope}`);
  console.log(`\n📊 Modules with view permission:\n`);
  
  const modulesWithView = [];
  targetRole.permissions.forEach((perms, moduleId) => {
    const viewPerm = perms.get ? perms.get('view') : perms.view;
    if (viewPerm === true) {
      modulesWithView.push(moduleId);
    }
  });
  
  console.log(`   Modules with view=true: ${modulesWithView.join(', ') || 'NONE'}`);
  console.log(`\n💡 If modules are still not showing, check the employee's roleId field\n`);
}

console.log("=".repeat(50) + "\n");
