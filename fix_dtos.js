const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Backend DTOs\n');

const dtoPath = path.join(__dirname, 'backend', 'src', 'modules', 'survey', 'dto', 'site-survey.dto.ts');
let content = fs.readFileSync(dtoPath, 'utf8');

// Fix 1: Add assignedTo to CreateSiteSurveyDto
console.log('1. Adding assignedTo to CreateSiteSurveyDto...');
const createPattern = `  @IsString()
  @IsOptional()
  engineer?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;`;

const createReplacement = `  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string; // Engineer user ID for filtering

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;`;

if (content.includes(createPattern)) {
  content = content.replace(createPattern, createReplacement);
  console.log('   ✅ Added assignedTo field to CreateSiteSurveyDto\n');
} else {
  // Try alternative - find engineer field and add after it
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('engineer?: string;') && lines[i-1].includes('@IsOptional()')) {
      // Insert assignedTo field after engineer
      lines.splice(i + 1, 0, 
        '',
        '  @IsString()',
        '  @IsOptional()',
        '  assignedTo?: string; // Engineer user ID for filtering'
      );
      console.log('   ✅ Added assignedTo using line insertion\n');
      break;
    }
  }
  content = lines.join('\n');
}

// Fix 2: Add fields to MoveToActiveDto
console.log('2. Adding fields to MoveToActiveDto...');
const movePattern = `export class MoveToActiveDto {
  @IsOptional()
  activeData!: ActiveSurveyDataDto;

  @IsString()
  @IsOptional()
  notes?: string;
}`;

const moveReplacement = `export class MoveToActiveDto {
  @IsOptional()
  activeData!: ActiveSurveyDataDto;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string; // Engineer user ID for filtering
}`;

if (content.includes(movePattern)) {
  content = content.replace(movePattern, moveReplacement);
  console.log('   ✅ Added engineer and assignedTo fields to MoveToActiveDto\n');
} else {
  // Try to find the class and add fields before closing brace
  const lines = content.split('\n');
  let inMoveToActive = false;
  let foundNotes = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export class MoveToActiveDto')) {
      inMoveToActive = true;
    }
    if (inMoveToActive && lines[i].includes('notes?: string;')) {
      foundNotes = true;
      // Add new fields after notes
      lines.splice(i + 1, 0,
        '',
        '  @IsString()',
        '  @IsOptional()',
        '  engineer?: string;',
        '',
        '  @IsString()',
        '  @IsOptional()',
        '  assignedTo?: string; // Engineer user ID for filtering'
      );
      console.log('   ✅ Added fields using line insertion\n');
      break;
    }
  }
  content = lines.join('\n');
}

fs.writeFileSync(dtoPath, content, 'utf8');

console.log('='.repeat(60));
console.log('✅ ALL DTO FIXES APPLIED!');
console.log('='.repeat(60));
console.log('\nUpdated DTOs:');
console.log('  1. CreateSiteSurveyDto - has assignedTo field');
console.log('  2. MoveToActiveDto - has engineer and assignedTo fields');
console.log('\n📌 RESTART BACKEND SERVER NOW!');
