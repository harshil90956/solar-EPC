with open('frontend/src/pages/ServicePage.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search bar lines to insert
search_bar_lines = [
    '\n',
    '          {/* Search Bar */}\n',
    '          <div className="flex justify-end mb-3">\n',
    '            <div className="relative w-64">\n',
    '              <input\n',
    '                type="text"\n',
    '                placeholder="Search tickets..."\n',
    '                value={ticketSearch}\n',
    '                onChange={(e) => setTicketSearch(e.target.value)}\n',
    '                className="w-full px-3 py-2 pl-9 text-xs bg-[var(--bg-elevated)] border border-[var(--border-base)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"\n',
    '              />\n',
    '              <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n',
    '                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />\n',
    '              </svg>\n',
    '              {ticketSearch && (\n',
    '                <button\n',
    '                  onClick={() => setTicketSearch(\'\')}\n',
    '                  className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"\n',
    '                >\n',
    '                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n',
    '                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />\n',
    '                  </svg>\n',
    '                </button>\n',
    '              )}\n',
    '            </div>\n',
    '          </div>\n',
]

# Find lines containing "Status Summary Cards" - insert search bar before them
new_lines = []
inserted_count = 0

for i, line in enumerate(lines):
    # Check if this line contains "Status Summary Cards"
    if '{/* Status Summary Cards */}' in line and inserted_count < 2:
        # Insert search bar lines before this line
        new_lines.extend(search_bar_lines)
        inserted_count += 1
    new_lines.append(line)

with open('frontend/src/pages/ServicePage.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Inserted search bar {inserted_count} times!")
