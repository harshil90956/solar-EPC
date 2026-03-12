const fs = require('fs');
const path = require('path');

console.log('🔧 Applying Backend Fixes...\n');

// Fix 1: Update moveToActive service
console.log('1. Updating moveToActive service...');
const servicePath = path.join(__dirname, 'backend', 'src', 'modules', 'survey', 'services', 'site-surveys.service.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf8');

const oldService = `    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      { $or: [{ _id: id }, { surveyId: id }] },
      {
        status: SurveyStatus.ACTIVE,
        activeData: {
          ...moveDto.activeData,
          startedAt: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();`;

const newService = `    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
      { $or: [{ _id: id }, { surveyId: id }] },
      {
        status: SurveyStatus.ACTIVE,
        engineer: moveDto.engineer || survey.engineer,
        assignedEngineerId: moveDto.assignedTo || survey.assignedEngineerId,
        activeData: {
          ...moveDto.activeData,
          startedAt: new Date()
        },
        notes: moveDto.notes || survey.notes,
        updatedAt: new Date()
      },
      { new: true }
    ).exec();`;

if (serviceContent.includes(oldService)) {
  serviceContent = serviceContent.replace(oldService, newService);
  fs.writeFileSync(servicePath, serviceContent, 'utf8');
  console.log('   ✅ Service updated - saves engineer and assignedEngineerId\n');
} else {
  console.log('   ⚠️  Could not find target code - may already be updated\n');
}

// Fix 2: Add fields to MoveToActiveDto
console.log('2. Updating MoveToActiveDto...');
const dtoPath = path.join(__dirname, 'backend', 'src', 'modules', 'survey', 'dto', 'site-survey.dto.ts');
let dtoContent = fs.readFileSync(dtoPath, 'utf8');

const oldDto = `export class MoveToActiveDto {
  @IsOptional()
  activeData!: ActiveSurveyDataDto;

  @IsString()
  @IsOptional()
  notes?: string;
}`;

const newDto = `export class MoveToActiveDto {
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

if (dtoContent.includes(oldDto)) {
  dtoContent = dtoContent.replace(oldDto, newDto);
  fs.writeFileSync(dtoPath, dtoContent, 'utf8');
  console.log('   ✅ MoveToActiveDto updated - added engineer and assignedTo fields\n');
} else {
  console.log('   ⚠️  Could not find MoveToActiveDto - may already be updated\n');
}

// Fix 3: Add assignedTo to CreateSiteSurveyDto
console.log('3. Updating CreateSiteSurveyDto...');
dtoContent = fs.readFileSync(dtoPath, 'utf8');

const oldEngineerField = `  @IsString()
  @IsOptional()
  engineer?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;`;

const newEngineerField = `  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string; // Engineer user ID for filtering

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;`;

if (dtoContent.includes(oldEngineerField)) {
  dtoContent = dtoContent.replace(oldEngineerField, newEngineerField);
  fs.writeFileSync(dtoPath, dtoContent, 'utf8');
  console.log('   ✅ CreateSiteSurveyDto updated - added assignedTo field\n');
} else {
  console.log('   ⚠️  Could not find engineer field - may already be updated\n');
}

console.log('='.repeat(60));
console.log('✅ ALL BACKEND FIXES APPLIED!');
console.log('='.repeat(60));
console.log('\nChanges:');
console.log('  1. moveToActive now saves engineer name AND assignedEngineerId');
console.log('  2. MoveToActiveDto accepts engineer and assignedTo fields');
console.log('  3. CreateSiteSurveyDto accepts assignedTo field');
console.log('\n📌 RESTART YOUR BACKEND SERVER NOW!');
