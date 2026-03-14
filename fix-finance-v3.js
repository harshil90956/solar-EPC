const fs = require('fs');

const filePath = 'frontend/src/pages/FinancePage.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Fix 1: Change the filter condition
const oldFilter = '.filter(v => v.outstandingAmount > 0 || v.amountPaid > 0);';
const newFilter = '.filter(v => v.totalPurchaseOrders > 0 || v.outstandingAmount > 0 || v.amountPaid > 0);';

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  console.log('✅ Fixed filter condition');
} else {
  console.log('⚠️ Filter pattern not found or already fixed');
}

// Fix 2: Remove if(!exists) block
// Find the pattern with the if statement and its matching closing brace
const oldIfBlock = `          if (!exists) {



            const vendorPOs = purchaseOrders.filter(po => {



              const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;







              return String(poVendorId) === String(vendorId);







            });











            const totalPayable = vendorPOs.reduce((sum, po) => sum + Number(po?.totalAmount || 0), 0);







            const totalPaid = vendorPOs.reduce((sum, po) => sum + Number(po?.amountPaid || 0), 0);











            try {







              await financeApi.syncFinanceVendor({







                vendorId: String(vendorId),







                vendorName: v?.name || v?.vendorName || 'Unknown',







                vendorCode: v?.id || \`V-\${String(vendorId).slice(-4)}\`,











                totalPayable,







                totalPaid,







                totalPurchaseOrders: vendorPOs.length,











              });











            } catch (syncErr) {







              console.error('Failed to sync vendor:', vendorId, syncErr);











            }











          }`;

const newIfBlock = `          // Always sync vendor data (new and existing)
          const vendorPOs = purchaseOrders.filter(po => {
            const poVendorId = (po?.vendorId && typeof po.vendorId === 'object') ? po.vendorId?._id : po?.vendorId;
            return String(poVendorId) === String(vendorId);
          });

          const totalPayable = vendorPOs.reduce((sum, po) => sum + Number(po?.totalAmount || 0), 0);
          const totalPaid = vendorPOs.reduce((sum, po) => sum + Number(po?.amountPaid || 0), 0);

          try {
            await financeApi.syncFinanceVendor({
              vendorId: String(vendorId),
              vendorName: v?.name || v?.vendorName || 'Unknown',
              vendorCode: v?.id || \`V-\${String(vendorId).slice(-4)}\`,
              totalPayable,
              totalPaid,
              totalPurchaseOrders: vendorPOs.length,
            });
          } catch (syncErr) {
            console.error('Failed to sync vendor:', vendorId, syncErr);
          }`;

if (content.includes(oldIfBlock)) {
  content = content.replace(oldIfBlock, newIfBlock);
  console.log('✅ Fixed if(!exists) block');
} else {
  console.log('⚠️ If block pattern not found - may need manual fix');
}

fs.writeFileSync(filePath, content);
console.log('File saved!');
