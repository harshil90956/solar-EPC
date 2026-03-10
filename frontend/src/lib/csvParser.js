// Simple CSV parser to replace papaparse
// Handles basic CSV parsing with headers

export function parseCSV(text, options = {}) {
  const { header = true, skipEmptyLines = true, dynamicTyping = true } = options;
  
  // Split into lines
  const lines = text.split('\n');
  
  // Filter empty lines if requested
  const filteredLines = skipEmptyLines 
    ? lines.filter(line => line.trim() !== '')
    : lines;
  
  if (filteredLines.length === 0) {
    return { data: [] };
  }
  
  // Parse CSV line handling quotes
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };
  
  // Convert value type if dynamicTyping is enabled
  const convertValue = (value) => {
    if (!dynamicTyping) return value;
    
    // Try to convert to number
    if (value === '' || value === null || value === undefined) {
      return '';
    }
    
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      return num;
    }
    
    // Try to convert to boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Try to convert to date (ISO format)
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    return value;
  };
  
  // Parse headers
  const headers = parseLine(filteredLines[0]);
  
  // Parse data rows
  const dataRows = filteredLines.slice(1).map(line => {
    const values = parseLine(line);
    
    if (header) {
      // Create object with header keys
      const row = {};
      headers.forEach((h, i) => {
        row[h] = convertValue(values[i] || '');
      });
      return row;
    } else {
      // Return array of values
      return values.map(convertValue);
    }
  });
  
  return { data: dataRows };
}

// Simple CSV unparse (convert data to CSV string)
export function unparseCSV(data, options = {}) {
  const { headers = null } = options;
  
  if (!data || data.length === 0) {
    return '';
  }
  
  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Escape value for CSV
  const escapeValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  // Create CSV lines
  const lines = [
    csvHeaders.join(','),
    ...data.map(row => 
      csvHeaders.map(h => escapeValue(row[h])).join(',')
    )
  ];
  
  return lines.join('\n');
}
