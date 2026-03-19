import re

# Read the file
with open('e:/Enacle/solar-EPC/frontend/src/pages/ServicePage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handleAssignEngineer to only store engineer ID
old_assign_pattern = r'const handleAssignEngineer = async \(\) \{[^}]*console\.log\(\'Assigning engineer:\', selectedEngineer, \'to ticket:\', assignModal\.ticket\.id\);[^}]*setAssigning\(true\);[^}]*try \{[^}]*const result = await updateTicket\(assignModal\.ticket\.id, \{ assignedTo: selectedEngineer \}\);[^}]*console\.log\(\'Assign success:\', result\);[^}]*setTickets\(prev => prev\.map\(t => t\.id === assignModal\.ticket\.id \? \{ \.\.\.t, assignedTo: selectedEngineer \} : t\)\);[^}]*closeAssignModal\(\);[^}]*showToast\(`Engineer "\$\{selectedEngineer\}" assigned successfully`, \'success\'\);[^}]*\} catch \(err\) \{[^}]*console\.error\(\'Assign error:\', err\);[^}]*showToast\(\'Failed to assign engineer: \' \+ \(err\.message \|\| \'Unknown error\'\), \'error\'\);[^}]*\} finally \{[^}]*setAssigning\(false\);[^}]*\}[^}]*\};'

new_assign_code = '''const handleAssignEngineer = async () => {
    if (!selectedEngineer || !assignModal.ticket) {
      console.log('Assign cancelled: no engineer or ticket selected');
      return;
    }
    console.log('Selecting engineer:', selectedEngineer, 'for ticket:', assignModal.ticket.id);
    setAssigning(true);
    try {
      const engineer = engineers.find(e => e.name === selectedEngineer || e.email === selectedEngineer);
      if (engineer) {
        setVisitForm(prev => ({ ...prev, engineerId: String(engineer.id || engineer._id) }));
        console.log('Engineer selected:', engineer.name, 'ID:', engineer.id || engineer._id);
      }
      closeAssignModal();
      showToast(`Engineer "${selectedEngineer}" selected`, 'success');
    } catch (err) {
      console.error('Select engineer error:', err);
      showToast('Failed to select engineer: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setAssigning(false);
    }
  };'''

# Replace handleAssignEngineer
content = re.sub(old_assign_pattern, new_assign_code, content, flags=re.DOTALL)

# 2. Update handleScheduleVisit to add engineer assignment at the beginning of try block
old_schedule_pattern = r'(const handleScheduleVisit = async \(\) \{[^}]*try \{)\s*(const visitData = \{)'

new_schedule_prefix = r'''1:
      const engineer = engineers.find(e => String(e.id || e._id) === String(engineerId));
      const engineerName = engineer?.name || '';
      
      if (contractId && engineerName) {
        await updateTicket(contractId, { assignedTo: engineerName });
        setTickets(prev => prev.map(t => t.id === contractId ? { ...t, assignedTo: engineerName } : t));
        showToast(`Engineer "${engineerName}" assigned successfully`, 'success');
      }
      
      if (scheduleVisitProjectData?.email) {
        showToast(`Email notification will be sent to ${scheduleVisitProjectData.email}`, 'success');
      }

      \2'''

content = re.sub(old_schedule_pattern, new_schedule_prefix, content, flags=re.DOTALL)

# 3. Update engineer_name in visitData to use engineerName
content = re.sub(
    r"engineer_name: engineers\.find\(e => e\.id === engineerId\)\?\.name \|\| '',",
    "engineer_name: engineerName,",
    content
)

# Write back
with open('e:/Enacle/solar-EPC/frontend/src/pages/ServicePage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated ServicePage.js")
