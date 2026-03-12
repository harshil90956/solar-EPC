const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'SiteSurveyPage.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the broken template literal
const broken = "engineer: engineerLabel ? ${engineerLabel.firstName}  : ''";
const fixed = "engineer: engineerLabel ? `${engineerLabel.firstName} ${engineerLabel.lastName}` : ''";

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed template literal for engineer name');
} else {
  console.log('❌ Could not find broken template literal');
  console.log('Checking current state...');
  if (content.includes('engineerLabel.firstName') && content.includes('engineerLabel.lastName')) {
    console.log('✅ Template literal appears correct');
  } else {
    console.log('⚠️  Need manual verification');
  }
}
