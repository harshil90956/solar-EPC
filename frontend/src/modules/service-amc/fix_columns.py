#!/usr/bin/env python3
"""Fix TICKET_COLUMNS array in ServicePage.js"""

import re

file_path = r'e:\Enacle\solar-EPC\frontend\src\pages\ServicePage.js'

# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Correct TICKET_COLUMNS array
new_columns = '''const TICKET_COLUMNS = [





    { key: 'id', header: 'Ticket ID', render: v => <span className="text-xs font-mono text-[var(--accent-light)]">{v}</span> },





    { key: 'customerName', header: 'Customer', sortable: true, render: v => <span className="text-xs font-semibold text-[var(--text-primary)]">{v}</span> },





    { key: 'type', header: 'Type', render: v => <span className="text-xs text-[var(--text-secondary)]">{v}</span> },





    { key: 'description', header: 'Description', render: v => <span className="text-xs text-[var(--text-muted)] max-w-[200px] truncate block">{v}</span> },





    { key: 'priority', header: 'Priority', render: v => <PriorityBadge value={v} /> },





    { key: 'status', header: 'Status', render: v => <StatusBadge domain="ticket" value={v} /> },





    { key: 'nextSchedule', header: 'Next Schedule', render: (v, ticket) => { 





        // Find next scheduled visit for this ticket (visit.contractId matches ticket.id)





        const nextVisit = visits.find(visit => 





          visit.contractId === ticket.id && 





          visit.status === 'Scheduled' 





        ); 





        if (!nextVisit) return <span className="text-xs text-[var(--text-muted)]">—</span>; 





        const date = nextVisit.scheduled_date || nextVisit.scheduledDate; 





        const time = nextVisit.scheduled_time || nextVisit.scheduledTime; 





        return ( 





          <div className="flex flex-col"> 





            <span className="text-xs text-[var(--text-primary)]">{date}</span> 





            <span className="text-[10px] text-[var(--text-muted)]">{time}</span> 





          </div> 





        ); 





      } 





    },





    { key: 'resolved', header: 'Resolved', render: v => <span className="text-xs text-[var(--text-muted)]">{v ?? '—'}</span> },





    { key: 'created', header: 'Created', render: v => <span className="text-xs text-[var(--text-muted)]">{v}</span> },





  ];'''

# Pattern to match the corrupted TICKET_COLUMNS array
# Find from "const TICKET_COLUMNS = [" to the next "const " or "// Fetch" or similar
pattern = r'const TICKET_COLUMNS = \[.*?\];'

# Find all matches and replace the first one
matches = list(re.finditer(pattern, content, re.DOTALL))
print(f"Found {len(matches)} TICKET_COLUMNS definitions")

if matches:
    # Get the first match
    match = matches[0]
    print(f"Match spans from {match.start()} to {match.end()}")
    
    # Replace with new content
    new_content = content[:match.start()] + new_columns + content[match.end():]
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully replaced TICKET_COLUMNS")
else:
    print("Could not find TICKET_COLUMNS pattern")
    # Try alternative approach - find by line numbers
    lines = content.split('\n')
    print(f"File has {len(lines)} lines")
