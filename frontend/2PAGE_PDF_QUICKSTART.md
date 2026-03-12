# 2-Page Professional PDF - Quick Start Guide

## 🚀 Ready to Use!

Your professional 2-page PDF format is now integrated and ready!

## How to Use

### From Quotation Page

1. **Open any quotation** from the list
2. **Click the quotation card** to view details
3. **Click "2-Page PDF" button** in the footer
4. ✅ PDF downloads automatically!

That's it! No extra steps needed.

## What You Get

### Page 1 - Cover Page
```
┌─────────────────────────────┐
│  Company Header (Teal)      │
│  Contact Info               │
│                             │
│      [QUOTATION BADGE]      │
│                             │
│  Customer Details           │
│  Project Overview           │
│  System Highlights          │
│  Key Benefits               │
└─────────────────────────────┘
```

### Page 2 - Commercials
```
┌─────────────────────────────┐
│  Pricing Table              │
│  Payment Terms              │
│  Scope of Work              │
│  Terms & Conditions         │
│  Contact Footer             │
└─────────────────────────────┘
```

## Features Included

✅ **Professional Design**
- Teal/Gold color scheme
- Clean modern layout
- Branded header and footer
- Proper margins and spacing

✅ **Complete Information**
- Customer details
- Project specifications
- Pricing breakdown
- Payment terms
- Scope of work
- Terms & conditions

✅ **Easy Distribution**
- Compact 2-page format
- Email-friendly size
- Print-ready A4
- Professional appearance

## Sample Output

The generated PDF includes:

**Page 1:**
- Company branding at top
- Quotation number and date
- Customer information card
- Project details card
- System features (bullet points)
- Benefits summary (savings, ROI, lifespan)

**Page 2:**
- Detailed pricing table
- Payment schedule with percentages
- Complete scope of work
- Standard terms & conditions
- Contact information bar

## Customization

### Change Company Info

Edit the `companyData` parameter:

```javascript
download2PagePDF(data, 'filename.pdf', {
  name: 'Your Company Name',
  phone: '+91 XXXXX XXXXX',
  email: 'info@yourcompany.com',
  // ... more fields
});
```

### Modify Colors

In `pdfTemplate.js`, update the color constants:

```javascript
const C = {
  primary: [0, 102, 102],    // Change to your brand color
  accent: [255, 193, 7],     // Change accent color
  // ...
};
```

## Data Requirements

### Minimum Required Fields

```javascript
{
  quotationNumber: 'QT-001',     // Document ID
  customerName: 'Customer Name', // Customer
  systemCapacity: 5,            // System size in kW
  total: 250000,                // Total amount
  subtotal: 230000,             // Before GST
}
```

### Optional Fields (with defaults)

```javascript
{
  highlights: [...],           // System features
  annualSavings: '₹85,000',    // Expected savings
  roiPeriod: '3-4 Years',      // Return period
  paymentTerms: [...],         // Payment schedule
  scopeOfWork: [...]          // Work included
}
```

## Testing

### Quick Test

Open browser console and run:

```javascript
// Import the function (if in dev tools)
import { download2PagePDF } from './src/lib/pdfTemplate';

// Test data
const test = {
  quotationNumber: 'TEST-001',
  customerName: 'Test Customer',
  systemCapacity: 5,
  total: 250000,
  subtotal: 230000
};

// Generate PDF
download2PagePDF(test, 'Test_Quotation.pdf');
```

### Full Test

1. Go to Quotation Page
2. Open any existing quotation
3. Click "2-Page PDF" button
4. Verify PDF downloaded
5. Check formatting and content

## Troubleshooting

### PDF Not Downloading?

**Check:**
- Browser popup blocker settings
- File is not blocked by antivirus
- Sufficient disk space

**Solution:**
- Allow popups for your domain
- Check download folder permissions

### Layout Issues?

**Common causes:**
- Missing required data fields
- Very long text in fields
- Special characters in text

**Fix:**
- Ensure all required fields present
- Keep text concise
- Use proper string formatting

### Colors Wrong?

**Check:**
- RGB values are arrays `[R, G, B]`
- Values are 0-255 range
- Color definitions before usage

## Integration Status

| Page | Status | Button Label |
|------|--------|--------------|
| QuotationPage | ✅ Integrated | "2-Page PDF" |
| EstimatePage | ⏳ Optional | Add manually |
| ProposalPage | ⏳ Optional | Add manually |
| DocumentPage | ⏳ Optional | Add manually |

## Next Steps

### Immediate
1. ✅ Test the PDF generation
2. ✅ Review the output quality
3. ✅ Customize company info if needed

### Optional Enhancements
- [ ] Add company logo image
- [ ] Include QR code for online verification
- [ ] Add digital signature placeholder
- [ ] Create multiple template variants
- [ ] Add customer logo on cover page

## File Locations

```
frontend/src/lib/pdfTemplate.js
  └── generate2PageProfessionalPDF()  (Line ~46)
  └── download2PagePDF()              (Line ~447)

frontend/src/pages/QuotationPage.js
  └── Import statement                (Line 18)
  └── Download button                 (Line 550)

Documentation:
frontend/2PAGE_PDF_FORMAT.md         - Detailed format guide
frontend/2PAGE_PDF_LAYOUT.md         - Visual layout guide
frontend/2PAGE_PDF_QUICKSTART.md     - This file
```

## Support

### Need Help?

1. **Check documentation** in the MD files
2. **Review the code** in pdfTemplate.js
3. **Test with sample data** first
4. **Verify data structure** matches requirements

### Common Questions

**Q: Can I change the colors?**
A: Yes! Edit the `C` object in pdfTemplate.js

**Q: Can I add more sections?**
A: Yes! Add them after existing sections in the function

**Q: Can I make it 1 page?**
A: Possible but will be crowded. 2 pages is optimal.

**Q: Does it work offline?**
A: Yes! All processing is client-side.

## Success Criteria

You'll know it's working when:
- ✅ PDF downloads on button click
- ✅ Both pages are properly formatted
- ✅ All data displays correctly
- ✅ Colors match the design
- ✅ Text is readable and aligned
- ✅ Tables render properly
- ✅ Contact info appears in footer

---

## 🎉 You're All Set!

The 2-page professional PDF format is ready to use. Just click the "2-Page PDF" button on any quotation to download!

**Questions or issues?** Check the detailed documentation files or review the code comments in pdfTemplate.js.

---

**Created**: March 11, 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready
