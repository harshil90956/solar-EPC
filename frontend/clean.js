const fs = require('fs');
const content = fs.readFileSync('src/pages/SurveyPage.js', 'utf8');
const lines = content.split('\n');
// Keep first 798 lines (up to and including closing brace)
const cleanLines = lines.slice(0, 798);
// Add clean export
const output = cleanLines.join('\n') + '\n\nexport default SurveyPage;\n';
fs.writeFileSync('src/pages/SurveyPage.js', output, 'utf8');
console.log('File cleaned successfully - now has', cleanLines.length + 2, 'lines');
