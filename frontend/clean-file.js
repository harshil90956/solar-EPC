const fs = require('fs');

const filePath = 'src/pages/SurveyPage.js';
let content = fs.readFileSync(filePath, 'utf8');

// Remove all null bytes and non-printable characters except newlines
content = content.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

// Find the first occurrence of 'export default SurveyPage' and keep only up to that point
const idx = content.indexOf('export default SurveyPage');
if (idx > 0) {
  // Keep everything up to and including the export statement
  content = content.substring(0, idx + 25);
}

// Ensure clean ending with single newline
content = content.trimEnd() + '\n';

fs.writeFileSync(filePath, content, 'utf8');
console.log('File cleaned successfully');
