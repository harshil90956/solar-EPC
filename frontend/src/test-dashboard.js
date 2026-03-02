// Quick test script to verify role-based dashboard functionality
// Run this in browser console to test different roles

console.log('Testing role-based dashboard functionality...');

// Test user credentials
const testUsers = [
    { role: 'Admin', email: 'admin@solarcorp.com', password: 'admin123' },
    { role: 'Sales', email: 'sales@solarcorp.com', password: 'sales123' },
    { role: 'Project Manager', email: 'pm@solarcorp.com', password: 'pm123' },
    { role: 'Design Engineer', email: 'design@solarcorp.com', password: 'design123' },
];

console.log('Available test users:', testUsers);

// Test if authentication context is available
if (window.React) {
    console.log('✅ React is loaded');
} else {
    console.log('❌ React not found');
}

console.log('To test:');
console.log('1. Open http://localhost:3000');
console.log('2. Use any of the credentials above');
console.log('3. Verify dashboard loads without errors');
console.log('4. Check role-specific content displays');
