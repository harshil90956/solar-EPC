// Fix INV3552 Inventory Script
// Run: node fix-inventory.js

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/projects/fix-inventory/inv3552?tenantId=solarcorp',
  method: 'POST',
};

console.log('Calling API to fix INV3552 inventory...');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.success) {
        console.log('\n✅ SUCCESS! Inventory fixed.');
        console.log('Reserved cleared:', parsed.before?.reserved, '->', parsed.after?.reserved);
        console.log('Available updated:', parsed.before?.available, '->', parsed.after?.available);
      } else {
        console.log('\n❌ Failed:', parsed.message);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Connection Error:', e.message);
  console.log('Is backend running? Check with: tasklist | findstr node');
});

req.end();
