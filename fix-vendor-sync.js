const fs = require('fs');

const filePath = 'frontend/src/pages/FinancePage.js';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

console.log('Total lines:', lines.length);

// Find the line with "if (!exists) {"
let ifLineIndex = -1;
let closingBraceLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if (!exists) {')) {
    ifLineIndex = i;
    console.log('Found if (!exists) at line:', i + 1);
    break;
  }
}

if (ifLineIndex === -1) {
  console.log('Could not find if (!exists) block');
  process.exit(1);
}

// Now find the matching closing brace
// The structure is:
// Line N: if (!exists) {
// Line N+1-N+K: content (with nested braces)
// Line N+K+1: }  <- this closes the if
// Line N+K+2: }  <- this closes the for loop
// Line N+K+3: }  <- this closes the try block

// The pattern we want is:
// After the try-catch block inside the if, there's a closing brace for the if
// Then 2 more closing braces (for the for loop and the outer try)

// Looking at the structure from earlier read:
// Line ~7218: } closes the if
// Line ~7234: } closes the for loop  
// Line ~7250: } catch (fvErr) { - this is the catch for the outer try

// Let's look for the pattern where we have:
// } catch (syncErr) { ... } (closing the inner try)
// } (closing the if)
// } (closing the for)
// } catch (fvErr) { (closing the outer try)

// Find the line with "} catch (syncErr)"
let catchSyncErrLine = -1;
for (let i = ifLineIndex; i < lines.length && i < ifLineIndex + 200; i++) {
  if (lines[i].includes('} catch (syncErr)')) {
    catchSyncErrLine = i;
    console.log('Found } catch (syncErr) at line:', i + 1);
    break;
  }
}

if (catchSyncErrLine === -1) {
  console.log('Could not find } catch (syncErr)');
  process.exit(1);
}

// Find the matching closing brace for the syncErr catch block
// It should be a } followed by blank lines, then another }, then blank lines, then } catch (fvErr)
let syncErrCatchClosing = -1;
let braceCount = 1;
for (let i = catchSyncErrLine + 1; i < lines.length && i < catchSyncErrLine + 50; i++) {
  const line = lines[i];
  if (line.includes('{')) braceCount++;
  if (line.includes('}')) braceCount--;
  
  if (braceCount === 0) {
    syncErrCatchClosing = i;
    console.log('Found closing brace for syncErr catch at line:', i + 1);
    break;
  }
}

if (syncErrCatchClosing === -1) {
  console.log('Could not find closing brace for syncErr catch');
  process.exit(1);
}

// Now the next non-empty line should be the closing brace for the if (!exists) block
// Let's look ahead for the pattern
let ifClosingBrace = -1;
let forLoopClosingBrace = -1;
let foundSyncFvErr = false;

for (let i = syncErrCatchClosing + 1; i < lines.length && i < syncErrCatchClosing + 30; i++) {
  const trimmed = lines[i].trim();
  
  if (trimmed === '}' && ifClosingBrace === -1) {
    ifClosingBrace = i;
    console.log('Found if closing brace at line:', i + 1);
    continue;
  }
  
  if (trimmed === '}' && ifClosingBrace !== -1 && forLoopClosingBrace === -1) {
    forLoopClosingBrace = i;
    console.log('Found for loop closing brace at line:', i + 1);
    continue;
  }
  
  if (trimmed.startsWith('} catch (fvErr)')) {
    foundSyncFvErr = true;
    console.log('Found } catch (fvErr) at line:', i + 1);
    break;
  }
}

if (ifClosingBrace === -1) {
  console.log('Could not find if closing brace');
  process.exit(1);
}

// Now make the changes:
// 1. Comment out the if (!exists) { line
// 2. Remove the closing brace at ifClosingBrace

console.log('\nMaking changes...');

// Replace "if (!exists) {" with comment
lines[ifLineIndex] = '          // Always sync vendor data (new and existing)';

// Remove the closing brace line (replace with empty/comment)
lines[ifClosingBrace] = '          // Vendor sync completed';

// Write back
fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ Changes saved!');
console.log('- Commented out if (!exists) at line', ifLineIndex + 1);
console.log('- Removed closing brace at line', ifClosingBrace + 1);
