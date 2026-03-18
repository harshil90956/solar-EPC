import re

# Read the file
with open('frontend/src/pages/ServicePage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace handleAssignEngineer to save engineerId to visitForm instead of calling updateTicket
old_handleAssignEngineer = '''const handleAssignEngineer = async () => {
    if (!selectedEngineer || !assignModal.ticket) {
      console.log('Assign cancelled: no engineer or ticket selected');
      return;
    }
    console.log('Assigning engineer:', selectedEngineer, 'to ticket:', assignModal.ticket.id);
    setAssigning(true);
    try {
      const result = await updateTicket(assignModal.ticket.id, { assignedTo: selectedEngineer });
      console.log('Assign success:', result);
      setTickets(prev => prev.map(t => t.id === assignModal.ticket.id ? { ...t, assignedTo: selectedEngineer } : t));
      closeAssignModal();
      showToast(`Engineer "${selectedEngineer}" assigned successfully`, 'success');
    } catch (err) {
      console.error('Assign error:', err);
      showToast('Failed to assign engineer: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setAssigning(false);
    }
  };'''

new_handleAssignEngineer = '''const handleAssignEngineer = async () => {
    if (!selectedEngineer || !assignModal.ticket) {
      console.log('Assign cancelled: no engineer or ticket selected');
      return;
    }
    console.log('Selecting engineer:', selectedEngineer, 'for ticket:', assignModal.ticket.id);
    setAssigning(true);
    try {
      // Find engineer object to get the ID
      const engineer = engineers.find(e => e.name === selectedEngineer || e.email === selectedEngineer);
      if (engineer) {
        // Save engineerId to visitForm for later use when scheduling visit
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

content = content.replace(old_handleAssignEngineer, new_handleAssignEngineer)

# Fix 2: Add engineer assignment logic in handleScheduleVisit before creating visit
# Find the line "// Create the visit (this will show in Schedule Visit tab)" and add code before it

old_schedule_comment = '''      // Create the visit (this will show in Schedule Visit tab)

      await createVisit(visitData);'''

new_schedule_comment = '''      // Assign engineer to ticket first
      if (engineerId && scheduleVisitModal.contract?.id) {
        try {
          await updateTicket(scheduleVisitModal.contract.id, { assignedTo: engineerId });
          showToast('Engineer assigned to ticket', 'success');
        } catch (assignErr) {
          console.error('Failed to assign engineer to ticket:', assignErr);
        }
      }

      // Create the visit (this will show in Schedule Visit tab)

      await createVisit(visitData);'''

content = content.replace(old_schedule_comment, new_schedule_comment)

# Write back
with open('frontend/src/pages/ServicePage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied both fixes!")
print("1. handleAssignEngineer now saves engineerId to visitForm instead of assigning immediately")
print("2. handleScheduleVisit now assigns engineer to ticket before creating visit")
