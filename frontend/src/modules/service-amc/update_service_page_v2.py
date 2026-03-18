import re

# Read the file
with open('e:/Enacle/solar-EPC/frontend/src/pages/ServicePage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the console.log line in handleAssignEngineer
content = re.sub(
    r"console\.log\('Assigning engineer:', selectedEngineer, 'to ticket:', assignModal\.ticket\.id\);",
    "console.log('Selecting engineer:', selectedEngineer, 'for ticket:', assignModal.ticket.id);",
    content
)

# 2. Remove the updateTicket call in handleAssignEngineer
content = re.sub(
    r"const result = await updateTicket\(assignModal\.ticket\.id, \{ assignedTo: selectedEngineer \}\);[\s\S]*?console\.log\('Assign success:', result\);[\s\S]*?setTickets\(prev => prev\.map\(t => t\.id === assignModal\.ticket\.id \? \{ \.\.\.t, assignedTo: selectedEngineer \} : t\)\);[\s\S]*?",
    "",
    content
)

# 3. Replace the error message in handleAssignEngineer
content = re.sub(
    r"console\.error\('Assign error:', err\);[\s\S]*?showToast\('Failed to assign engineer: ' \+ \(err\.message \|\| 'Unknown error'\), 'error'\);",
    "console.error('Select engineer error:', err);\n      showToast('Failed to select engineer: ' + (err.message || 'Unknown error'), 'error');",
    content
)

# 4. Add the engineer selection logic after setAssigning(true)
content = re.sub(
    r"(setAssigning\(true\);[\s\S]*?)try \{",
    r"\1try {\n      const engineer = engineers.find(e => e.name === selectedEngineer || e.email === selectedEngineer);\n      if (engineer) {\n        setVisitForm(prev => ({ ...prev, engineerId: String(engineer.id || engineer._id) }));\n        console.log('Engineer selected:', engineer.name, 'ID:', engineer.id || engineer._id);\n      }\n      closeAssignModal();\n      showToast(`Engineer \"${selectedEngineer}\" selected`, 'success');",
    content
)

# 5. In handleScheduleVisit, add engineer assignment after try {
content = re.sub(
    r"(const handleScheduleVisit = async \(\) \{[\s\S]*?)try \{[\s\S]*?(const visitData = \{)",
    r"\1try {\n      const engineer = engineers.find(e => String(e.id || e._id) === String(engineerId));\n      const engineerName = engineer?.name || '';\n      \n      if (contractId && engineerName) {\n        await updateTicket(contractId, { assignedTo: engineerName });\n        setTickets(prev => prev.map(t => t.id === contractId ? { ...t, assignedTo: engineerName } : t));\n        showToast(`Engineer \"${engineerName}\" assigned successfully`, 'success');\n      }\n      \n      if (scheduleVisitProjectData?.email) {\n        showToast(`Email notification will be sent to ${scheduleVisitProjectData.email}`, 'success');\n      }\n\n      \2",
    content
)

# 6. Update engineer_name in visitData
content = re.sub(
    r"engineer_name: engineers\.find\(e => e\.id === engineerId\)\?\.name \|\| '',",
    "engineer_name: engineerName,",
    content
)

# Write back
with open('e:/Enacle/solar-EPC/frontend/src/pages/ServicePage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated ServicePage.js")
