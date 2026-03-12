import re
import os

# Change working directory to frontend pages
os.chdir(r'e:\solar-EPC\frontend\src\pages')

# Read the file
with open('SiteSurveyPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace line 1647 - Change from name-based to ID-based filtering
old_code = """// Filter by assigned engineer - non-admin users only see their assigned surveys
      const engineerFilter = (!isAdmin && user?.name) ? user.name : '';
      console.log('[SiteSurvey] User:', user?.name, '| Is Admin:', isAdmin, '| Engineer Filter:', engineerFilter);
      const response = await siteSurveysApi.getAll({ status, search: searchQuery, engineer: engineerFilter, limit: 100 });"""

new_code = """// Filter by assigned engineer ID (not name) for security - non-admin users only see their assigned surveys
      const engineerIdFilter = (!isAdmin && user?.id) ? user.id : '';
      console.log('[SiteSurvey] User ID:', user?.id, '| Is Admin:', isAdmin, '| Filter by ID:', engineerIdFilter);
      const response = await siteSurveysApi.getAll({ status, search: searchQuery, engineerId: engineerIdFilter, limit: 100 });"""

content = content.replace(old_code, new_code)

# Replace line 1663 - Update dependency array
old_deps = "}, [activeTab, searchQuery, isAdmin, user?.name]);"
new_deps = "}, [activeTab, searchQuery, isAdmin, user?.id]);"

content = content.replace(old_deps, new_deps)

# Write back
with open('SiteSurveyPage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Frontend updated successfully!")
print("  - Changed filter from engineer NAME to engineer ID")
print("  - Updated dependency array to use user?.id")
