const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Backend Service - moveToActive method\n');

const servicePath = path.join(__dirname, 'backend', 'src', 'modules', 'survey', 'services', 'site-surveys.service.ts');
let content = fs.readFileSync(servicePath, 'utf8');

// Find the findOneAndUpdate block and add engineer fields
const searchPattern = `      {
        status: SurveyStatus.ACTIVE,
        activeData: {
          ...moveDto.activeData,
          startedAt: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },`;

const replacement = `      {
        status: SurveyStatus.ACTIVE,
        engineer: moveDto.engineer || survey.engineer,
        assignedEngineerId: moveDto.assignedTo || survey.assignedEngineerId,
        activeData: {
          ...moveDto.activeData,
          startedAt: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },`;

if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(servicePath, content, 'utf8');
  console.log('✅ SUCCESS! Updated moveToActive to save engineer and assignedEngineerId');
  console.log('\nAdded fields:');
  console.log('  - engineer: moveDto.engineer || survey.engineer');
  console.log('  - assignedEngineerId: moveDto.assignedTo || survey.assignedEngineerId');
} else {
  console.log('❌ Could not find the pattern. Trying alternative approach...\n');
  
  // Try line-by-line replacement
  const lines = content.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('status: SurveyStatus.ACTIVE,')) {
      // Insert the two new fields after this line
      lines.splice(i + 1, 0, 
        '        engineer: moveDto.engineer || survey.engineer,',
        '        assignedEngineerId: moveDto.assignedTo || survey.assignedEngineerId,'
      );
      found = true;
      console.log('✅ Added engineer fields using line insertion method');
      break;
    }
  }
  
  if (found) {
    fs.writeFileSync(servicePath, lines.join('\n'), 'utf8');
  } else {
    console.log('❌ Could not find location to insert code');
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(60));
console.log('📌 RESTART BACKEND SERVER TO APPLY CHANGES!');
console.log('='.repeat(60));
