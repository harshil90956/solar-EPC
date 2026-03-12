import os

# Change working directory to backend controller
os.chdir(r'e:\solar-EPC\backend\src\modules\survey\controllers')

# Read the file
with open('site-surveys.controller.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update findAll method (lines 75-78)
old_controller = """  findAll(@Query() query: QuerySiteSurveyDto) {
    console.log('[SITE-SURVEYS] API called with query:', query);
    return this.siteSurveysService.findAll(query);
  }"""

new_controller = """  @UseGuards(JwtAuthGuard, TenantGuard)
  findAll(@Query() query: QuerySiteSurveyDto, @Request() req: any) {
    // Extract user info from JWT token
    const userId = req.user?.sub || req.user?.id;
    const userRole = req.user?.role;
    
    console.log('[SITE-SURVEYS] User ID:', userId, 'Role:', userRole);
    return this.siteSurveysService.findAll(query, userId, userRole);
  }"""

content = content.replace(old_controller, new_controller)

# Write back
with open('site-surveys.controller.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Backend Controller updated successfully!")
print("  - Added JwtAuthGuard and TenantGuard")
print("  - Extracting userId and userRole from JWT token")
print("  - Passing user info to service for filtering")
