const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING ALL ASSIGN ENGINEER FIXES...\n');
console.log('='.repeat(60));

let allGood = true;

// Check 1: Frontend dropdown
console.log('\n1. Checking Frontend Dropdown...');
const frontendPath = path.join(__dirname, 'frontend', 'src', 'pages', 'SiteSurveyPage.js');
const frontendContent = fs.readFileSync(frontendPath, 'utf8');

if (frontendContent.includes('value={emp._id}')) {
  console.log('   ✅ Dropdown uses engineer ID (emp._id)');
} else {
  console.log('   ❌ Dropdown still uses name - FIX NOT APPLIED');
  allGood = false;
}

// Check 2: Frontend form submission
console.log('\n2. Checking Frontend Form Submission...');
if (frontendContent.includes('assignedTo: formData.engineer')) {
  console.log('   ✅ Form sends assignedTo field');
} else {
  console.log('   ❌ Form missing assignedTo field - FIX NOT APPLIED');
  allGood = false;
}

// Check 3: Backend service
console.log('\n3. Checking Backend Service...');
const servicePath = path.join(__dirname, 'backend', 'src', 'modules', 'survey', 'services', 'site-surveys.service.ts');
const serviceContent = fs.readFileSync(servicePath, 'utf8');

if (serviceContent.includes('engineer: moveDto.engineer') && 
    serviceContent.includes('assignedEngineerId: moveDto.assignedTo')) {
  console.log('   ✅ Service saves engineer and assignedEngineerId');
} else {
  console.log('   ❌ Service not saving fields - FIX NOT APPLIED');
  allGood = false;
}

// Check 4: Backend DTOs
console.log('\n4. Checking Backend DTOs...');
const dtoPath = path.join(__dirname, 'backend', 'src', 'modules', 'survey', 'dto', 'site-survey.dto.ts');
const dtoContent = fs.readFileSync(dtoPath, 'utf8');

const hasAssignedToInCreate = dtoContent.match(/CreateSiteSurveyDto[\s\S]{0,500}assignedTo\?: string/);
const hasAssignedToInMove = dtoContent.match(/MoveToActiveDto[\s\S]{0,500}assignedTo\?: string/);

if (hasAssignedToInCreate) {
  console.log('   ✅ CreateSiteSurveyDto has assignedTo field');
} else {
  console.log('   ❌ CreateSiteSurveyDto missing assignedTo - FIX NOT APPLIED');
  allGood = false;
}

if (hasAssignedToInMove) {
  console.log('   ✅ MoveToActiveDto has assignedTo field');
} else {
  console.log('   ❌ MoveToActiveDto missing assignedTo - FIX NOT APPLIED');
  allGood = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
  console.log('✅ ALL FIXES VERIFIED SUCCESSFULLY!');
  console.log('\n📌 NEXT STEP: RESTART BACKEND SERVER');
  console.log('   Then test the survey assignment flow.');
} else {
  console.log('❌ SOME FIXES ARE MISSING!');
  console.log('\nPlease check the fixes above and apply them manually.');
}
console.log('='.repeat(60));

process.exit(allGood ? 0 : 1);
