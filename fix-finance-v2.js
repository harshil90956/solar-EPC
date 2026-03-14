const fs = require('fs');

const filePath = 'frontend/src/pages/FinancePage.js';
let content = fs.readFileSync(filePath, 'utf-8');
const originalLength = content.length;

console.log('Original file length:', originalLength);

// Fix 1: Change the filter on line 6978
const oldFilter = '.filter(v => v.outstandingAmount > 0 || v.amountPaid > 0);';
const newFilter = '.filter(v => v.totalPurchaseOrders > 0 || v.outstandingAmount > 0 || v.amountPaid > 0);';

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  console.log('✅ Fixed filter condition');
} else {
  console.log('⚠️ Could not find filter pattern');
}

// Fix 2: Remove the if(!exists) condition on line 7074
// The pattern includes all the whitespace/newlines
const oldIfPattern = /if \(!exists\) \{\s*\n\s*\n\s*\n\s*const vendorPOs = purchaseOrders\.filter/;
const newIfPattern = '// Always sync/update vendor data (new and existing)\\n            const vendorPOs = purchaseOrders.filter';

if (oldIfPattern.test(content)) {
  content = content.replace(oldIfPattern, newIfPattern);
  console.log('✅ Fixed if(!exists) condition');
  
  // Also need to remove the matching closing brace
  // Find and remove one of the closing braces
  const oldClosing = /\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\}\s*\n\s*\} catch \(syncErr\)/;
  const newClosing = '}\\n          }\\n        }\\n      } catch (syncErr)';
  
  if (oldClosing.test(content)) {
    content = content.replace(oldClosing, newClosing);
    console.log('✅ Fixed closing braces');
  } else {
    console.log('⚠️ Could not find closing braces pattern');
  }
} else {
  console.log('⚠️ Could not find if(!exists) pattern');
}

// Only write if changes were made
if (content.length !== originalLength) {
  fs.writeFileSync(filePath, content);
  console.log('✅ Changes saved successfully!');
} else {
  console.log('⚠️ No changes were made');
}
