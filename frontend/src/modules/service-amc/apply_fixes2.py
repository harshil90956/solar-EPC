import re

# Read the file
with open('frontend/src/pages/ServicePage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Replace handleAssignEngineer function using regex to handle varying whitespace
# The key is to match the function signature and body, ignoring blank lines

old_assign_pattern = r'''const handleAssignEngineer = async \(\) => \{[^}]*if \(!selectedEngineer \|\| !assignModal\.ticket\)[^}]*return;[^}]*\}[^}]*console\.log\('Assigning engineer:', selectedEngineer[^}]*setAssigning\(true\);[^}]*try \{[^}]*const result = await updateTicket\(assignModal\.ticket\.id, \{ assignedTo: selectedEngineer \}\);[^}]*console\.log\('Assign success:', result\);[^}]*setTickets\(prev => prev\.map\(t => t\.id === assignModal\.ticket\.id \? \{ \.\.\.t, assignedTo: selectedEngineer \} : t\)\);[^}]*closeAssignModal\(\);[^}]*showToast\(`Engineer "\$\{selectedEngineer\}" assigned successfully`, 'success'\);[^}]*\} catch \(err\) \{[^}]*console\.error\('Assign error:', err\);[^}]*showToast\('Failed to assign engineer: ' \+ \(err\.message \|\| 'Unknown error'\), 'error'\);[^}]*\} finally \{[^}]*setAssigning\(false\);[^}]*\}[^}]*\};'''

new_assign_func = '''const handleAssignEngineer = async () => {
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

# Try regex replacement
match = re.search(old_assign_pattern, content, re.DOTALL)
if match:
    print(f"Found handleAssignEngineer at position {match.start()}-{match.end()}")
    content = content[:match.start()] + new_assign_func + content[match.end():]
    print("✓ handleAssignEngineer replaced successfully")
else:
    print("✗ Could not find handleAssignEngineer pattern")

# Fix 2: Add engineer assignment in handleScheduleVisit
old_schedule_pattern = r'''// Create the visit \(this will show in Schedule Visit tab\)[^}]*await createVisit\(visitData\);'''

new_schedule_code = '''// Assign engineer to ticket first
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

match2 = re.search(old_schedule_pattern, content, re.DOTALL)
if match2:
    print(f"Found schedule visit section at position {match2.start()}-{match2.end()}")
    content = content[:match2.start()] + new_schedule_code + content[match2.end():]
    print("✓ handleScheduleVisit updated successfully")
else:
    print("✗ Could not find handleScheduleVisit pattern")

# Write back
with open('frontend/src/pages/ServicePage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFixes applied!")
