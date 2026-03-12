import os

# Change working directory to backend service
os.chdir(r'e:\solar-EPC\backend\src\modules\survey\services')

# Read the file
with open('site-surveys.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Update method signature (line 76)
old_signature = "async findAll(query: QuerySiteSurveyDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {"
new_signature = "async findAll(query: QuerySiteSurveyDto, userId?: string, userRole?: string): Promise<{ data: any[]; total: number; page: number; limit: number }> {"

content = content.replace(old_signature, new_signature)

# Step 2: Update filter logic (lines 99-101)
old_filter = """    if (engineer) {
      filter.engineer = { $regex: engineer, $options: 'i' };
    }"""

new_filter = """    // SECURITY FILTER: Only show assigned surveys to non-admin users
    if (userId && userRole !== 'admin') {
      // Engineer/Employee: Only see surveys assigned to them
      filter.assignedEngineerId = userId;
      console.log('[SiteSurveysService] Engineer filter - User ID:', userId);
    } else if (engineer) {
      // Admin can search by engineer name
      filter.engineer = { $regex: engineer, $options: 'i' };
    }"""

content = content.replace(old_filter, new_filter)

# Write back
with open('site-surveys.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Backend Service updated successfully!")
print("  - Added userId and userRole parameters")
print("  - Added security filter by assignedEngineerId")
