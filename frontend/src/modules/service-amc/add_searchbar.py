import re

with open('frontend/src/pages/ServicePage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Search bar HTML to insert
search_bar = '''
          {/* Search Bar */}
          <div className="flex justify-end mb-3">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search tickets..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full px-3 py-2 pl-9 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
              />
              <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {ticketSearch && (
                <button
                  onClick={() => setTicketSearch('')}
                  className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
'''

# Find kanban view section and insert search bar after first "View Cards" button
# Pattern: find the first occurrence of the button container div closing, then insert search bar
kanban_pattern = r"(          </div>\n          {/* Status Summary Cards */})"
matches = list(re.finditer(kanban_pattern, content))

if len(matches) >= 2:
    # First match is kanban view, second is table view
    # Insert search bar after each match
    
    # Process in reverse order to maintain positions
    for i, match in enumerate(reversed(matches[:2])):  # Only first 2 matches
        pos = match.start(1)
        content = content[:pos] + search_bar + content[pos:]
    
    with open('frontend/src/pages/ServicePage.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully added search bar to both kanban and table views!")
else:
    print(f"Found {len(matches)} matches, expected at least 2")
