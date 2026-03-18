#!/usr/bin/env python3
"""Fix TICKET_ACTIONS array to add Schedule Visit between Edit and Mark Resolved"""

import re

file_path = r'e:\Enacle\solar-EPC\frontend\src\pages\ServicePage.js'

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find and replace
old_pattern = r"({ label: 'Edit', icon: Pencil, onClick: row => openEditModal\(row\) },)\s*({ label: 'Mark Resolved', icon: CheckCircle, onClick: \(row\) => handleStageChange\(row\.id, 'Resolved'\) },)"

new_replacement = r"""\1





    { label: 'Schedule Visit', icon: Clock, onClick: (row) => openScheduleVisitModal(row) },





    \2"""

# Replace
new_content = re.sub(old_pattern, new_replacement, content)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully added Schedule Visit between Edit and Mark Resolved")
