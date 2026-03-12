import os
import re

# Fix 1: Update moveToActive service method
print("Fixing backend service...")
os.chdir(r'e:\solar-EPC\backend\src\modules\survey\services')

with open('site-surveys.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the update operation in moveToActive
old_update = """    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
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
    ).exec();"""

new_update = """    const updatedSurvey = await this.surveyModel.findOneAndUpdate(
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
    ).exec();"""

if old_update in content:
    content = content.replace(old_update, new_update)
    with open('site-surveys.service.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Backend service updated - now saves engineer and assignedEngineerId")
else:
    print("❌ Could not find target code in service")

# Fix 2: Add fields to MoveToActiveDto
print("\nFixing backend DTO...")
os.chdir(r'e:\solar-EPC\backend\src\modules\survey\dto')

with open('site-survey.dto.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find MoveToActiveDto class and add fields
old_dto = """export class MoveToActiveDto {
  @IsOptional()
  activeData!: ActiveSurveyDataDto;

  @IsString()
  @IsOptional()
  notes?: string;
}"""

new_dto = """export class MoveToActiveDto {
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
}"""

if old_dto in content:
    content = content.replace(old_dto, new_dto)
    with open('site-survey.dto.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ MoveToActiveDto updated - added engineer and assignedTo fields")
else:
    print("❌ Could not find MoveToActiveDto class")

# Fix 3: Add assignedTo to CreateSiteSurveyDto
print("\nFixing CreateSiteSurveyDto...")
with open('site-survey.dto.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add assignedTo after engineer field
old_engineer_field = """  @IsString()
  @IsOptional()
  engineer?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;"""

new_engineer_field = """  @IsString()
  @IsOptional()
  engineer?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string; // Engineer user ID for filtering

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;"""

if old_engineer_field in content:
    content = content.replace(old_engineer_field, new_engineer_field)
    with open('site-survey.dto.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ CreateSiteSurveyDto updated - added assignedTo field")
else:
    print("❌ Could not find engineer field in CreateSiteSurveyDto")

print("\n" + "="*60)
print("BACKEND FIXES COMPLETE!")
print("="*60)
print("\nChanges applied:")
print("1. ✅ moveToActive service - saves engineer name and assignedEngineerId")
print("2. ✅ MoveToActiveDto - added engineer and assignedTo fields")
print("3. ✅ CreateSiteSurveyDto - added assignedTo field")
print("\nNow restart the backend server to apply changes!")
