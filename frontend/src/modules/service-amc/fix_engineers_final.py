#!/usr/bin/env python3
"""Fix fetchEngineers function in ServicePage.js to fetch HRM employees with department=engineer"""

file_path = r'e:\Enacle\solar-EPC\frontend\src\pages\ServicePage.js'

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if employeeApi import exists
if "employeeApi" not in content:
    # Add import before api import
    content = content.replace(
        "import { api } from '../lib/apiClient';",
        "import { employeeApi } from '../services/hrmApi';\nimport { api } from '../lib/apiClient';"
    )
    print("✓ Added employeeApi import")

# New fetchEngineers function
old_function = """  const fetchEngineers = async () => {

    try {

      const response = await getEngineers();

      setEngineers(Array.isArray(response) ? response : response?.data || []);

    } catch (err) {

      console.error('Engineers fetch error:', err);

      setEngineers([]);

    }

  };"""

new_function = """  const fetchEngineers = async () => {
    try {
      // Fetch employees from HRM module with department=engineer
      const response = await employeeApi.getByDepartment('engineer');
      const employeesData = Array.isArray(response) ? response : response?.data || [];
      
      // Map employee data to engineer format for compatibility
      const mappedEngineers = employeesData.map(emp => ({
        id: emp._id || emp.id,
        name: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        email: emp.email,
        department: emp.department,
        role: emp.role
      }));
      
      setEngineers(mappedEngineers);
    } catch (err) {
      console.error('Engineers fetch error:', err);
      setEngineers([]);
    }
  };"""

if old_function in content:
    content = content.replace(old_function, new_function)
    print("✓ Replaced fetchEngineers function")
else:
    print("Could not find exact fetchEngineers function pattern")
    # Try to find with flexible whitespace
    import re
    pattern = r'const fetchEngineers = async \(\) => \{[^}]*\};'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        print(f"Found function at position {match.start()}-{match.end()}")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
