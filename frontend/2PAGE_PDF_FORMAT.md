# 2-Page Professional PDF Format

## Overview
Professional 2-page quotation/proposal PDF format with clean layout and proper branding.

## Features

### Page 1: Cover Page
- **Professional Header**
  - Company logo and name
  - Contact information
  - Branded teal/gold color scheme
  
- **Document Badge**
  - Quotation number
  - Date and validity
  
- **Customer Details**
  - Customer name and address
  - Contact information
  
- **Project Overview**
  - Project name and capacity
  - System type and location
  
- **System Highlights**
  - Key features bullet points
  - Equipment specifications
  
- **Key Benefits**
  - Annual savings
  - ROI period
  - System lifespan

### Page 2: Commercials & Terms
- **Pricing Details**
  - Itemized cost breakdown
  - GST calculation
  - Total project cost
  - Price per kWp
  
- **Payment Terms**
  - Stage-wise payment schedule
  - Percentage and amounts
  
- **Scope of Work**
  - Complete list of deliverables
  - Installation details
  
- **Terms & Conditions**
  - Validity period
  - Delivery timeline
  - Important notes
  
- **Footer**
  - Contact information
  - Page numbers

## Usage

### Basic Usage
```javascript
import { download2PagePDF, generate2PageProfessionalPDF } from '../lib/pdfTemplate';

// Download directly
const handleDownload = () => {
  const quotationData = {
    quotationNumber: 'QT-2026-001',
    customerName: 'ABC Corporation',
    customerAddress: '123 Business Street, Mumbai',
    customerContact: '+91 98765 43210',
    projectName: '5kW Rooftop Solar System',
    systemCapacity: 5,
    installationLocation: 'Mumbai, Maharashtra',
    subtotal: 250000,
    gstRate: 8.9,
    gstAmount: 22250,
    total: 272250,
    highlights: [
      'Tier-1 Solar Panels with 25 Year Warranty',
      'High Efficiency Inverter with 5 Year Warranty',
      'Complete Mounting Structure & Cables',
      'Net Metering Support & Installation'
    ],
    annualSavings: '₹85,000',
    roiPeriod: '3-4 Years',
    paymentTerms: [
      { stage: 'Advance with Order', percentage: '40%', amount: 108900 },
      { stage: 'On Delivery of Material', percentage: '40%', amount: 108900 },
      { stage: 'After Commissioning', percentage: '20%', amount: 54450 }
    ],
    scopeOfWork: [
      'Site survey and system design',
      'Supply of all solar equipment',
      'Installation and commissioning',
      'Net metering installation support',
      '5 years comprehensive maintenance'
    ]
  };
  
  download2PagePDF(quotationData, 'Quotation_ABC_Corp.pdf');
};
```

### With Custom Company Data
```javascript
import { generate2PageProfessionalPDF } from '../lib/pdfTemplate';

const companyData = {
  name: 'YOUR COMPANY PVT. LTD.',
  tagline: 'Best Value & Quality Solar Solution',
  address: 'Your Address, City',
  phone: '+91 98765 43210',
  tollfree: '1800 XXX XXXX',
  email: 'info@yourcompany.com',
  website: 'www.yourcompany.com',
  gstin: '24ABCDE1234F1Z5'
};

const pdfBlob = generate2PageProfessionalPDF(quotationData, companyData);
// Use the blob (save, download, or send to server)
```

## Data Structure

### Required Fields
```typescript
interface QuotationData {
  // Document Info
  quotationNumber?: string;
  
  // Customer Details
  customerName: string;
  customerAddress: string;
  customerContact?: string;
  
  // Project Details
  projectName: string;
  systemCapacity: number;  // in kW
  installationLocation: string;
  
  // Pricing
  subtotal: number;
  gstRate?: number;
  gstAmount?: number;
  total: number;
  
  // Optional Enhancements
  highlights?: string[];
  annualSavings?: string;
  roiPeriod?: string;
  paymentTerms?: Array<{
    stage: string;
    percentage: string;
    amount: number;
  }>;
  scopeOfWork?: string[];
}
```

### Optional Fields with Defaults
```javascript
const defaults = {
  highlights: [
    'Tier-1 Solar Panels with 25 Year Warranty',
    'High Efficiency Inverter with 5 Year Warranty',
    'Complete Mounting Structure & Cables',
    'Net Metering Support & Installation'
  ],
  annualSavings: '₹85,000',
  roiPeriod: '3-4 Years',
  paymentTerms: [
    { stage: 'Advance with Order', percentage: '40%', amount: total * 0.40 },
    { stage: 'On Delivery of Material', percentage: '40%', amount: total * 0.40 },
    { stage: 'After Commissioning', percentage: '20%', amount: total * 0.20 }
  ],
  scopeOfWork: [
    'Site survey and system design',
    'Supply of all solar equipment',
    'Installation and commissioning',
    'Net metering installation support',
    '5 years comprehensive maintenance'
  ]
};
```

## Color Scheme

The PDF uses a professional Teal/Gold color palette:

- **Primary**: Teal (#006666)
- **Accent**: Gold (#FFC107)
- **Text**: Dark Gray (#333333)
- **Background**: Light Gray (#F5F5F5)

## Integration with Existing Pages

### QuotationPage
Already integrated! Click "2-Page PDF" button in the quotation detail modal.

### EstimatePage
Add the import and use in your estimate detail view:

```javascript
import { download2PagePDF } from '../lib/pdfTemplate';

const handleDownloadEstimate = (estimate) => {
  const data = {
    quotationNumber: estimate.estimateNumber,
    customerName: estimate.customerName,
    customerAddress: estimate.customerAddress,
    systemCapacity: estimate.systemSize,
    subtotal: estimate.costPrice,
    gstRate: 8.9,
    total: estimate.totalPrice,
  };
  
  download2PagePDF(data, `Estimate_${estimate.id}.pdf`);
};
```

### ProposalPage
Similar integration for proposals:

```javascript
import { download2PagePDF } from '../lib/pdfTemplate';

const handleDownloadProposal = (proposal) => {
  const data = {
    quotationNumber: proposal.proposalNumber,
    customerName: proposal.customerName,
    systemCapacity: proposal.systemCapacity,
    total: proposal.totalAmount,
  };
  
  download2PagePDF(data, `Proposal_${proposal.id}.pdf`);
};
```

## Benefits

✅ **Professional Design** - Clean, modern layout
✅ **Compact Format** - Exactly 2 pages, easy to review
✅ **Complete Information** - All essential details included
✅ **Branded Appearance** - Consistent company branding
✅ **Print-Ready** - A4 format, proper margins
✅ **Customizable** - Easy to modify colors and content

## Testing

Test the PDF generation with sample data:

```javascript
// Test in browser console
const testData = {
  quotationNumber: 'TEST-001',
  customerName: 'Test Customer',
  systemCapacity: 10,
  total: 500000,
};

download2PagePDF(testData);
```

## Troubleshooting

### PDF not downloading
- Check browser popup blocker settings
- Ensure jsPDF and jspdf-autotable are installed

### Layout issues
- Verify data structure matches required format
- Check for missing required fields

### Colors not showing
- Ensure RGB color arrays are used (not hex)
- Check color values are in [0-255] range

## Next Steps

1. ✅ Integrated with QuotationPage
2. 🔄 Add to EstimatePage (optional)
3. 🔄 Add to ProposalPage (optional)
4. 🔄 Customize company branding
5. 🔄 Add company logo (future enhancement)

---

**Created**: March 11, 2026
**Version**: 1.0
**Status**: Ready for Production
