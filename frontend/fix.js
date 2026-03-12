const fs = require('fs');
const path = 'src/pages/SurveyPage.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');
// Keep lines 0-798 (1-799 in 1-indexed), add clean export
const clean = lines.slice(0, 799).join('\n') + '\nexport default SurveyPage;\n';
fs.writeFileSync(path, clean, 'utf8');
console.log('Fixed');
