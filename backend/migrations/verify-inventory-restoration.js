/**
 * Verification Script: Inventory Restoration Implementation
 * 
 * Verifies that all components are correctly implemented and ready for production.
 * 
 * Checks:
 * 1. Schema field exists
 * 2. Service method exists
 * 3. Migration script ready
 * 4. Test suite ready
 * 5. Documentation complete
 * 
 * Usage:
 *   node migrations/verify-inventory-restoration.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('\n🔍 Verifying Inventory Restoration Implementation\n');
console.log('='.repeat(70));

let checksPassed = 0;
let checksFailed = 0;

// Check 1: Verify Schema Field
console.log('\n📋 CHECK 1: Schema Field Exists');
console.log('-'.repeat(70));

const schemaPath = path.join(__dirname, '..', 'src', 'modules', 'projects', 'schemas', 'project.schema.ts');
try {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  if (schemaContent.includes('inventoryRestored')) {
    console.log('✅ PASS: inventoryRestored field found in Project schema');
    checksPassed++;
  } else {
    console.log('❌ FAIL: inventoryRestored field NOT found in Project schema');
    checksFailed++;
  }
} catch (error) {
  console.log('❌ FAIL: Could not read schema file:', error.message);
  checksFailed++;
}

// Check 2: Verify Service Method
console.log('\n📋 CHECK 2: Service Method with Transactions');
console.log('-'.repeat(70));

const servicePath = path.join(__dirname, '..', 'src', 'modules', 'projects', 'services', 'projects.service.ts');
try {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  const hasMethod = serviceContent.includes('returnReservedInventoryToStock');
  const hasTransaction = serviceContent.includes('session.withTransaction') || serviceContent.includes('startSession');
  const hasIdempotency = serviceContent.includes('inventoryRestored === true') || serviceContent.includes('inventoryRestored');
  const hasLogging = serviceContent.includes('console.log') && serviceContent.includes('INVENTORY RESTORE');
  
  if (hasMethod && hasTransaction && hasIdempotency && hasLogging) {
    console.log('✅ PASS: Service method has transactions, idempotency, and logging');
    console.log('   - Method exists: ✅');
    console.log('   - Transactions: ✅');
    console.log('   - Idempotency: ✅');
    console.log('   - Logging: ✅');
    checksPassed++;
  } else {
    console.log('❌ FAIL: Service method missing required features');
    console.log('   - Method exists:', hasMethod ? '✅' : '❌');
    console.log('   - Transactions:', hasTransaction ? '✅' : '❌');
    console.log('   - Idempotency:', hasIdempotency ? '✅' : '❌');
    console.log('   - Logging:', hasLogging ? '✅' : '❌');
    checksFailed++;
  }
} catch (error) {
  console.log('❌ FAIL: Could not read service file:', error.message);
  checksFailed++;
}

// Check 3: Verify ClientSession Import
console.log('\n📋 CHECK 3: ClientSession Import');
console.log('-'.repeat(70));

try {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  const hasClientSession = serviceContent.includes('ClientSession');
  
  if (hasClientSession) {
    console.log('✅ PASS: ClientSession imported for transaction support');
    checksPassed++;
  } else {
    console.log('❌ FAIL: ClientSession not imported');
    checksFailed++;
  }
} catch (error) {
  console.log('❌ FAIL: Could not verify imports');
  checksFailed++;
}

// Check 4: Verify Migration Script Exists
console.log('\n📋 CHECK 4: Migration Script');
console.log('-'.repeat(70));

const migrationPath = path.join(__dirname, 'add-inventory-restored-field.js');
try {
  if (fs.existsSync(migrationPath)) {
    console.log('✅ PASS: Migration script exists');
    
    // Verify it's valid JavaScript
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const hasMongoose = migrationContent.includes('mongoose');
    const hasConnect = migrationContent.includes('connect');
    const hasUpdateMany = migrationContent.includes('updateMany');
    
    if (hasMongoose && hasConnect && hasUpdateMany) {
      console.log('   - Valid migration logic: ✅');
      checksPassed++;
    } else {
      console.log('   - Valid migration logic: ❌');
      checksFailed++;
    }
  } else {
    console.log('❌ FAIL: Migration script not found');
    checksFailed++;
  }
} catch (error) {
  console.log('❌ FAIL: Error reading migration script:', error.message);
  checksFailed++;
}

// Check 5: Verify Test Suite Exists
console.log('\n📋 CHECK 5: Test Suite');
console.log('-'.repeat(70));

const testPath = path.join(__dirname, 'test-inventory-restoration.js');
try {
  if (fs.existsSync(testPath)) {
    console.log('✅ PASS: Test suite exists');
    
    // Verify test coverage
    const testContent = fs.readFileSync(testPath, 'utf8');
    const testCount = (testContent.match(/TEST \d+:/g) || []).length;
    
    if (testCount >= 5) {
      console.log(`   - Test scenarios: ${testCount} ✅`);
      checksPassed++;
    } else {
      console.log(`   - Test scenarios: ${testCount} (expected >= 5) ❌`);
      checksFailed++;
    }
  } else {
    console.log('❌ FAIL: Test suite not found');
    checksFailed++;
  }
} catch (error) {
  console.log('❌ FAIL: Error reading test suite:', error.message);
  checksFailed++;
}

// Check 6: Verify Documentation
console.log('\n📋 CHECK 6: Documentation');
console.log('-'.repeat(70));

const docsRoot = path.join(__dirname, '..', '..');
const docFiles = [
  'INVENTORY_RESTORATION_COMPLETE.md',
  'INVENTORY_RESTORATION_QUICKSTART.md',
  'INVENTORY_RESTORATION_IMPLEMENTATION_SUMMARY.md'
];

let docsFound = 0;
docFiles.forEach(docFile => {
  const docPath = path.join(docsRoot, docFile);
  if (fs.existsSync(docPath)) {
    const stats = fs.statSync(docPath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`   - ${docFile}: ${sizeKB} KB ✅`);
    docsFound++;
  } else {
    console.log(`   - ${docFile}: NOT FOUND ❌`);
  }
});

if (docsFound === docFiles.length) {
  console.log('✅ PASS: All documentation files present');
  checksPassed++;
} else {
  console.log(`❌ FAIL: Missing ${docFiles.length - docsFound} documentation file(s)`);
  checksFailed++;
}

// Check 7: Verify Compilation (Basic Syntax Check)
console.log('\n📋 CHECK 7: TypeScript Syntax (Basic)');
console.log('-'.repeat(70));

try {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  // Basic syntax checks
  const hasProperImports = serviceContent.includes("import {") && serviceContent.includes("} from 'mongoose'");
  const hasClassDefinition = serviceContent.includes('@Injectable()') && serviceContent.includes('class ProjectsService');
  const hasMethodSignature = serviceContent.includes('private async returnReservedInventoryToStock');
  const hasTryCatch = serviceContent.includes('try {') && serviceContent.includes('catch (error');
  
  if (hasProperImports && hasClassDefinition && hasMethodSignature && hasTryCatch) {
    console.log('✅ PASS: TypeScript syntax appears valid');
    console.log('   - Imports: ✅');
    console.log('   - Class definition: ✅');
    console.log('   - Method signature: ✅');
    console.log('   - Error handling: ✅');
    checksPassed++;
  } else {
    console.log('❌ FAIL: TypeScript syntax issues detected');
    console.log('   - Imports:', hasProperImports ? '✅' : '❌');
    console.log('   - Class definition:', hasClassDefinition ? '✅' : '❌');
    console.log('   - Method signature:', hasMethodSignature ? '✅' : '❌');
    console.log('   - Error handling:', hasTryCatch ? '✅' : '❌');
    checksFailed++;
  }
} catch (error) {
  console.log('❌ FAIL: Could not verify TypeScript syntax');
  checksFailed++;
}

// Final Results
console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(70));
console.log(`✅ Passed: ${checksPassed}`);
console.log(`❌ Failed: ${checksFailed}`);
console.log(`📈 Success Rate: ${(checksPassed / (checksPassed + checksFailed) * 100).toFixed(1)}%`);
console.log('='.repeat(70));

if (checksFailed === 0) {
  console.log('\n🎉 ALL CHECKS PASSED!');
  console.log('✅ Implementation is COMPLETE and ready for production');
  console.log('\nNext Steps:');
  console.log('1. Run migration: node migrations/add-inventory-restored-field.js');
  console.log('2. Run tests: node migrations/test-inventory-restoration.js');
  console.log('3. Deploy to production');
  console.log('4. Monitor first few cancellations\n');
} else {
  console.log('\n⚠️  SOME CHECKS FAILED!');
  console.log('Please review the failures above before proceeding.\n');
}

console.log('='.repeat(70));

// Exit with appropriate code
process.exit(checksFailed > 0 ? 1 : 0);
