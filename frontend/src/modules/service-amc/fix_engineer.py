#!/usr/bin/env python3

file_path = 'e:/Enacle/solar-EPC/frontend/src/pages/ServicePage.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find handleAssignEngineer function
in_handle_assign = False
try_line = -1
close_assign_line = -1

for i, line in enumerate(lines):
    if 'const handleAssignEngineer = async () => {' in line:
        in_handle_assign = True
    if in_handle_assign and 'try {' in line:
        try_line = i
    if in_handle_assign and try_line > -1 and 'closeAssignModal();' in line:
        # Check this is before the catch block
        if i > try_line:
            close_assign_line = i
            break

print(f"handleAssignEngineer try at line {try_line + 1}")
print(f"closeAssignModal at line {close_assign_line + 1}")

if close_assign_line > -1:
    # Replace the closeAssignModal line with new code
    new_lines = [
        '      // Find engineer and save ID to visitForm\n',
        '      const engineer = engineers.find(e => e.name === selectedEngineer || e.email === selectedEngineer);\n',
        '      if (engineer) {\n',
        '        setVisitForm(prev => ({ ...prev, engineerId: String(engineer.id || engineer._id) }));\n',
        "        console.log('Engineer selected:', engineer.name, 'ID:', engineer.id || engineer._id);\n",
        '      }\n',
        '\n',
        '      closeAssignModal();\n'
    ]
    lines[close_assign_line] = ''.join(new_lines)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("SUCCESS: File updated")
else:
    print("ERROR: Could not find closeAssignModal line")
