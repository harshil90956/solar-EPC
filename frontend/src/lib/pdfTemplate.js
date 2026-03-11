import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================
// RAYZON PROFESSIONAL SOLAR PROPOSAL TEMPLATE
// Multi-page proposal format matching RAYZON design exactly
// ============================================================

// RAYZON Brand Colors (Teal/Green theme from images)
const RAYZON_COLORS = {
  primary: [0, 102, 102],      // Teal - #006666
  primaryDark: [0, 77, 77],    // Dark Teal
  primaryLight: [0, 128, 128], // Light Teal
  accent: [255, 193, 7],       // Gold/Yellow
  secondary: [51, 51, 51],     // Dark Gray
  lightGray: [245, 245, 245],  // Light Gray
  mediumGray: [160, 160, 160], // Medium Gray
  white: [255, 255, 255],
  black: [0, 0, 0],
  textGray: [80, 80, 80],
  tableHeader: [180, 180, 180], // Gray header for tables
  red: [220, 53, 69],          // Red for important notes
};

// Company Data - Rayzon Format
const COMPANY_DATA = {
  name: 'RAYZON GREEN PVT. LTD.',
  tagline: 'BEST VALUE & QUALITY SOLAR SOLUTION',
  subTagline: 'SHAPING A BETTER FUTURE',
  manufacturingName: 'RAYZON SOLAR PVT. LTD.',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  phone: '+91 96380 00461 / 62',
  tollfree: '1800 123 1232',
  email: 'epc@rayzongreen.com',
  website: 'www.rayzongreen.com',
  manufacturingAddress: 'Block No. 105, B/H Aron Pipes B/H Hariya Talav, Karanj Kim - Mandavi Road, Gujarat 394110',
  manufacturingEmail: 'contact@rayzonenergies.com',
  manufacturingWebsite: 'www.rayzonsolar.com',
};

// ============================================================
// 2-PAGE PROFESSIONAL QUOTATION FORMAT
// Compact, clean, and professional layout
// ============================================================

export const generate2PageProfessionalPDF = (data, companyData = null) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const company = companyData || {
    name: 'SUNOVA ENERGY PVT. LTD.',
    tagline: 'Best Value & Quality Solar Solution',
    address: 'Surat, Gujarat, India',
    phone: '+91 98765 43210',
    tollfree: '1800 XXX XXXX',
    email: 'info@sunova.com',
    website: 'www.sunova.com',
    gstin: '24ABCDE1234F1Z5',
  };

  // Colors
  const C = {
    primary: [0, 105, 92],       // Dark Teal
    primaryLight: [0, 150, 136], // Light Teal
    accent: [255, 152, 0],       // Orange/Gold
    white: [255, 255, 255],
    black: [0, 0, 0],
    gray: [97, 97, 97],
    lightGray: [250, 250, 250],
    border: [224, 224, 224],
  };

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  // ============================================
  // PAGE 1: COVER
  // ============================================
  
  // Header bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company name on header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(company.name, margin, 18);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(company.tagline, margin, 26);
  
  // Contact info right
  doc.setFontSize(8);
  doc.text(`${company.phone} | ${company.email}`, pageWidth - margin, 15, { align: 'right' });
  doc.text(`GSTIN: ${company.gstin}`, pageWidth - margin, 22, { align: 'right' });
  doc.text(company.website, pageWidth - margin, 29, { align: 'right' });
  
  // Quotation badge box
  const badgeX = pageWidth - 75;
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.primary);
  doc.roundedRect(badgeX, 48, 60, 35, 3, 3, 'FD');
  
  // Teal accent on badge
  doc.setFillColor(...C.primary);
  doc.roundedRect(badgeX, 48, 5, 35, 2, 2, 'F');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('QUOTATION', badgeX + 12, 62);
  
  doc.setFontSize(10);
  doc.setTextColor(C.gray);
  doc.text(`#${data.quotationNumber || 'QTN-XXXXXX'}`, badgeX + 12, 72);
  doc.setFontSize(8);
  doc.text(`Date: ${data.quotationDate || new Date().toISOString().split('T')[0]}`, badgeX + 12, 79);

  // CUSTOMER DETAILS BOX
  let y = 55;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('CUSTOMER DETAILS', margin, y);
  
  y += 8;
  doc.setFillColor(...C.lightGray);
  doc.setDrawColor(...C.border);
  doc.roundedRect(margin, y, 100, 35, 3, 3, 'FD');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(data.customerName || 'Customer Name', margin + 5, y + 12);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.gray);
  doc.text(data.companyName || data.customerName || '', margin + 5, y + 20);
  doc.text(data.customerAddress || 'Address not provided', margin + 5, y + 28);
  
  // PROJECT DETAILS BOX
  y += 45;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('PROJECT DETAILS', margin, y);
  
  y += 8;
  doc.setFillColor(...C.lightGray);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 40, 3, 3, 'FD');
  
  // Project info grid
  const col1X = margin + 5;
  const col2X = pageWidth / 2;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.gray);
  doc.text('Project Name:', col1X, y + 12);
  doc.text('System Capacity:', col2X, y + 12);
  doc.text('Project Type:', col1X, y + 22);
  doc.text('Installation:', col2X, y + 22);
  doc.text('Description:', col1X, y + 32);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.text(data.projectName || 'Solar Project', col1X + 30, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.systemCapacity || 5} kW`, col2X + 30, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.projectType || 'Commercial', col1X + 30, y + 22);
  doc.text(data.installationType || 'Rooftop', col2X + 30, y + 22);
  doc.text(data.description ? data.description.substring(0, 50) + '...' : 'Grid-tied solar system', col1X + 30, y + 32);

  // ============================================
  // PAGE 2: EQUIPMENT & COST (Side by Side)
  // ============================================
  doc.addPage();
  
  // Header
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(company.name, margin, 12);
  doc.setFontSize(8);
  doc.text(`Quotation #${data.quotationNumber || 'QTN-XXXXXX'}`, pageWidth - margin, 12, { align: 'right' });
  
  const eqMargin = margin;
  const eqWidth = 115;
  const costX = eqMargin + eqWidth + 8;
  const costWidth = pageWidth - costX - margin;
  let currentY = 28;
  
  // --- LEFT: EQUIPMENT & MATERIALS ---
  
  // Section Header
  doc.setFillColor(...C.primary);
  doc.roundedRect(eqMargin, currentY, eqWidth, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('EQUIPMENT & MATERIALS', eqMargin + 5, currentY + 7);
  
  currentY += 12;
  
  // Equipment items (use your data; fallback only if empty)
  const equipmentItems = (data.items && Array.isArray(data.items) && data.items.length > 0)
    ? data.items
    : [
      { name: 'Solar PV Module 550W', description: 'High-efficiency monocrystalline solar panel', quantity: 20 },
      { name: 'Grid Tie Inverter', description: '10kW three-phase solar inverter', quantity: 1 },
      { name: 'Mounting Structure', description: 'Galvanized iron mounting with clamps', quantity: 1 },
      { name: 'DC Cables', description: '4 sq.mm solar DC cable UV resistant', quantity: 100 },
      { name: 'AC Cables', description: '3.5C x 35 sq.mm copper AC cable', quantity: 50 },
      { name: 'Earthing Kit', description: 'Complete earthing system', quantity: 1 },
      { name: 'Lightning Arrestor', description: 'ESE lightning protection', quantity: 1 },
      { name: 'Installation', description: 'Complete installation & commissioning', quantity: 1 },
    ];

  const equipmentTableBody = equipmentItems.map((item, idx) => [
    String(idx + 1),
    String(item?.name ?? ''),
    String(item?.description ?? ''),
    String(item?.quantity ?? ''),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['No.', 'Item', 'Specification', 'Qty']],
    body: equipmentTableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: C.border,
      lineWidth: 0.2,
      textColor: [0, 0, 0],
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: C.primary,
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 54 },
      3: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
    },
    margin: {
      left: eqMargin,
      right: pageWidth - (eqMargin + eqWidth),
    },
    tableWidth: eqWidth,
  });

  const equipmentEndY = doc.lastAutoTable.finalY + 2;
  
  // Equipment footer
  doc.setFillColor(238, 238, 238);
  doc.rect(eqMargin, equipmentEndY, eqWidth, 12, 'F');
  doc.setDrawColor(...C.border);
  doc.rect(eqMargin, equipmentEndY, eqWidth, 12, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C.gray);
  const totalQty = equipmentItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  doc.text(`Items: ${equipmentItems.length}  |  Total Qty: ${totalQty}`, eqMargin + eqWidth - 5, equipmentEndY + 7.5, { align: 'right' });
  
  // --- RIGHT: COST SUMMARY ---
  
  let costY = 28;
  
  // Cost box header
  doc.setFillColor(...C.primary);
  doc.roundedRect(costX, costY, costWidth, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('COST SUMMARY', costX + costWidth/2, costY + 8, { align: 'center' });
  
  costY += 14;
  
  // Calculate costs
  const subtotal = data.subtotal || 250000;
  const gstRate = data.gstRate || 18;
  const gstAmount = data.gstAmount || Math.round(subtotal * gstRate / 100);
  const total = data.total || subtotal + gstAmount;
  const perKW = Math.round(subtotal / (data.systemCapacity || 5));
  
  // Cost box background
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.primary);
  doc.roundedRect(costX, costY, costWidth, 100, 2, 2, 'FD');
  
  // Cost rows
  const costs = [
    { label: 'Equipment', value: Math.round(subtotal * 0.70) },
    { label: 'Installation', value: Math.round(subtotal * 0.15) },
    { label: 'Engineering', value: Math.round(subtotal * 0.08) },
    { label: 'Transport', value: Math.round(subtotal * 0.04) },
    { label: 'Miscellaneous', value: Math.round(subtotal * 0.03) },
  ];
  
  let rowY = costY + 8;
  costs.forEach(cost => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.gray);
    doc.text(cost.label, costX + 5, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.black);
    doc.text(`₹${formatCurrency(cost.value)}`, costX + costWidth - 5, rowY, { align: 'right' });
    rowY += 10;
  });
  
  // Divider
  doc.setDrawColor(...C.border);
  doc.line(costX + 5, rowY, costX + costWidth - 5, rowY);
  rowY += 6;
  
  // Subtotal
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Subtotal', costX + 5, rowY);
  doc.text(`₹${formatCurrency(subtotal)}`, costX + costWidth - 5, rowY, { align: 'right' });
  rowY += 10;
  
  // GST (highlighted)
  doc.setFillColor(232, 245, 233);
  doc.rect(costX, rowY - 4, costWidth, 10, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...C.primary);
  doc.text(`GST ${gstRate}%`, costX + 5, rowY + 2);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${formatCurrency(gstAmount)}`, costX + costWidth - 5, rowY + 2, { align: 'right' });
  rowY += 12;
  
  // Grand Total
  doc.setFillColor(...C.primary);
  doc.roundedRect(costX, rowY - 2, costWidth, 16, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('Grand Total', costX + 5, rowY + 7);
  doc.setFontSize(12);
  doc.text(`₹${formatCurrency(total)}`, costX + costWidth - 5, rowY + 7, { align: 'right' });
  
  // Stats below cost box
  const statsY = costY + 110;
  doc.setFillColor(...C.lightGray);
  doc.roundedRect(costX, statsY, costWidth, 30, 2, 2, 'FD');
  
  const stats = [
    { val: `${data.systemCapacity || 5}`, lbl: 'kW' },
    { val: `${equipmentItems.length}`, lbl: 'Items' },
    { val: `₹${formatCurrency(perKW)}`, lbl: 'Per kW' },
  ];
  
  let statX = costX + 8;
  stats.forEach(stat => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primary);
    doc.text(stat.val, statX + 10, statsY + 12, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(C.gray);
    doc.text(stat.lbl, statX + 10, statsY + 18, { align: 'center' });
    statX += 22;
  });
  
  // --- BOTTOM SECTIONS ---
  
  let bottomY = Math.max(equipmentEndY + 20, statsY + 45);
  if (bottomY > pageHeight - 60) bottomY = pageHeight - 60;
  
  // Payment Terms
  doc.setFillColor(255, 248, 225);
  doc.setDrawColor(255, 160, 0);
  doc.roundedRect(eqMargin, bottomY, eqWidth, 35, 2, 2, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(230, 81, 0);
  doc.text('PAYMENT TERMS', eqMargin + 5, bottomY + 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const terms = data.paymentTerms || [
    { stage: 'Advance with Order', pct: '40%' },
    { stage: 'On Material Delivery', pct: '40%' },
    { stage: 'After Commissioning', pct: '20%' },
  ];
  let termRowY = bottomY + 16;
  terms.forEach((term, i) => {
    doc.text(`${i + 1}. ${term.stage}`, eqMargin + 5, termRowY);
    doc.setFont('helvetica', 'bold');
    doc.text(term.pct, eqMargin + eqWidth - 10, termRowY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    termRowY += 8;
  });
  
  // Scope of Work
  doc.setFillColor(232, 245, 233);
  doc.setDrawColor(76, 175, 80);
  doc.roundedRect(costX, bottomY, costWidth, 35, 2, 2, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(46, 125, 50);
  doc.text('SCOPE OF WORK', costX + 5, bottomY + 8);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const scopes = data.scopeOfWork || [
    'Site survey & design',
    'Equipment supply',
    'Installation',
    'Net metering support',
    '5-year maintenance',
  ];
  let scopeRowY = bottomY + 16;
  scopes.slice(0, 5).forEach(scope => {
    doc.text(`• ${scope}`, costX + 5, scopeRowY);
    scopeRowY += 5;
  });
  
  // Footer
  const footerY = pageHeight - 25;
  
  // Terms
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('Terms & Conditions:', margin, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.gray);
  doc.setFontSize(7);
  doc.text('1. Valid for 30 days  2. Delivery 4-6 weeks  3. Prices excl. civil works', margin + 35, footerY);
  
  // Signatures
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, footerY + 12, margin + 50, footerY + 12);
  doc.line(pageWidth - margin - 50, footerY + 12, pageWidth - margin, footerY + 12);
  
  doc.setFontSize(8);
  doc.text('Customer Signature', margin, footerY + 17);
  doc.text('Date & Stamp', margin, footerY + 22);
  doc.text('Authorized Signatory', pageWidth - margin - 50, footerY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('For Sunova Energy', pageWidth - margin, footerY + 22, { align: 'right' });
  
  // Page number
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(C.gray);
  doc.text('Page 2 of 2', pageWidth - margin - 10, pageHeight - 10, { align: 'right' });
  doc.text('Page 1 of 2', pageWidth - margin - 10, pageHeight - 5, { align: 'right' });
  
  return doc.output('blob');
};

// Helper function to download the 2-page PDF
export const download2PagePDF = (data, filename = null) => {
  const pdfBlob = generate2PageProfessionalPDF(data);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(pdfBlob);
  link.download = filename || `Quotation_${data.quotationNumber || Date.now()}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Draw section header with teal accent bar
const drawSectionHeader = (doc, title, subtitle, y, C = RAYZON_COLORS) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Teal accent bar
  doc.setFillColor(...C.primary);
  doc.rect(margin, y, 25, 4, 'F');

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text(title.toUpperCase(), margin, y + 18);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.secondary);
    doc.text(subtitle.toUpperCase(), margin, y + 32);
  }

  return y + 45;
};

// Draw footer with page number
const drawPageFooter = (doc, pageNum, totalPages, C = RAYZON_COLORS) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Page number at bottom right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.mediumGray);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 30, pageHeight - 15);

  // Teal line at bottom
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(0.5);
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
};

// Format currency
const formatCurrency = (amount) => {
  if (!amount) return '0';
  return amount.toLocaleString('en-IN');
};

// ============================================================
// PAGE RENDERERS
// ============================================================

// PAGE 1: Cover Page
const renderCoverPage = (doc, data, company, C = RAYZON_COLORS) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Solar farm image placeholder area (top 60% of page)
  doc.setFillColor(100, 150, 200);
  doc.rect(0, 0, pageWidth, pageHeight * 0.6, 'F');

  // Curved white transition
  doc.setFillColor(...C.white);
  doc.ellipse(pageWidth / 2, pageHeight * 0.58, pageWidth, 40, 'F');

  // Company Logo at top right
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('RAYZON', pageWidth - 100, 40);
  doc.setFontSize(16);
  doc.text('GREEN', pageWidth - 40, 40);

  // Main Tagline
  const taglineY = pageHeight * 0.68;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.mediumGray);
  doc.text('BEST VALUE & QUALITY', 20, taglineY);

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('SOLAR SOLUTION', 20, taglineY + 12);

  // Sub tagline
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.primary);
  doc.text('| SHAPING A BETTER FUTURE', 20, taglineY + 28);

  // Powered By section at bottom right
  const bottomY = pageHeight - 50;
  doc.setFontSize(9);
  doc.setTextColor(...C.textGray);
  doc.text('Powered By', pageWidth - 70, bottomY);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('RAYZON', pageWidth - 70, bottomY + 12);
  doc.setFontSize(10);
  doc.text('SOLAR', pageWidth - 25, bottomY + 12);

  drawPageFooter(doc, 1, 9);
};

// PAGE 2: Executive Summary
const renderExecutiveSummary = (doc, data, company, C = RAYZON_COLORS, pageNum = 2, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'EXECUTIVE', 'SUMMARY', 30, C);
  const pageWidth = doc.internal.pageSize.width;
  const margin = 25;
  const contentWidth = pageWidth - (margin * 2);

  // Salutation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.textGray);
  doc.text('To, Our Esteemed Customer', margin + 20, y + 10);
  y += 25;

  // Company Introduction Paragraph
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);

  const introText = `Rayzon Solar is one of the largest solar panel manufacturers in India, With cutting-edge technology and its state-of-art production facility of 6.0GW in the Vibrant state of Gujarat, India. The company was founded in 2016 with the belief that sunlight should be used more efficiently to create a carbon free globe for customers, partners, and communities.`;

  const introLines = doc.splitTextToSize(introText, contentWidth - 20);
  doc.text(introLines, margin + 20, y);
  y += introLines.length * 5 + 15;

  // Second paragraph
  const secondText = `Rayzon Solar is committed to sustainability and has contributed to the Government-administered Solar Power Projects in rooftop and commercial setups. Has also expanded its reach globally with exports to five countries, including the USA and Europe. Has gained a reputation for producing highly reliable photovoltaic modules for a wide range of domestic, commercial, and industrial applications.`;

  const secondLines = doc.splitTextToSize(secondText, contentWidth - 20);
  doc.text(secondLines, margin + 20, y);
  y += secondLines.length * 5 + 15;

  // Quote
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.primaryDark);
  const quoteText = `"To make our future more vibrant and sustainable by using green energy to save the earth."`;
  const quoteLines = doc.splitTextToSize(quoteText, contentWidth - 30);
  doc.text(quoteLines, margin + 20, y);
  y += quoteLines.length * 5 + 20;

  // Rayzon Green paragraph
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const greenText = `Rayzon Green, a dedicated service subsidiary, manages EPC projects for RAYZON Solar, ensuring all operation at peak potential with cost-effective and resource-efficient practices. Our commitment is to deliver optimal project outcomes that align with your goals and sustainability objectives.`;

  const greenLines = doc.splitTextToSize(greenText, contentWidth - 20);
  doc.text(greenLines, margin + 20, y);
  y += greenLines.length * 5 + 20;

  // Closing
  doc.text('We looking forward to serve you better in near future.', margin + 20, y);
  y += 30;

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('Thanking Yours,', pageWidth - 80, y);
  doc.text('Team - Rayzon Solar', pageWidth - 80, y + 8);

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 3: General Information
const renderGeneralInformation = (doc, data, company, C = RAYZON_COLORS, pageNum = 3, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'GENERAL', 'INFORMATION', 30, C);
  const pageWidth = doc.internal.pageSize.width;
  const margin = 25;
  const centerX = pageWidth / 2;

  // Project Offer Synopsis Header
  y += 10;
  doc.setFillColor(...C.lightGray);
  doc.rect(centerX - 70, y, 140, 10, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('PROJECT OFFER SYNOPSIS :', centerX - 65, y + 7);

  // Info Table
  y += 15;
  const infoRows = [
    ['Client Name', data.customerName || 'PRAGATI IT PARK'],
    ['Customer Address', data.customerAddress || data.projectLocation || 'Surat, Gujarat'],
    ['Serial No.', data.proposalNumber || data.serialNo || 'RZ/2026BG31'],
    ['Capacity', `${data.systemCapacity || 130} kWp (DC)`],
    ['Date', new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')],
    ['Type of Offer', `Offer for Design, Engineering, Supply, Installation, Testing and Commissioning of ${data.systemCapacity || 130} kWp Rooftop Solar PV Power Plant.`],
    ['Rayzon Contact', data.contactPerson || 'Bhavin Goti'],
    ['Mobile No.', data.contactPhone || data.customerPhone || '+91 7096481293'],
    ['E-Mail', data.contactEmail || data.customerEmail || 'bhavin.g@rayzongreen.com'],
    ['Website', 'www.rayzonsolar.com'],
  ];

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
      font: 'helvetica',
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 245, 245] },
      1: { cellWidth: 100 },
    },
    margin: { left: centerX - 75 },
    tableWidth: 150,
  });

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 4: Why Rayzon Solar
const renderWhyRayzon = (doc, data, company, C = RAYZON_COLORS, pageNum = 4, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'WHY?', 'RAYZON SOLAR', 30, C);
  const margin = 25;
  const contentWidth = doc.internal.pageSize.width - (margin * 2);

  // Value Section
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Value', margin, y);

  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.black);
  const valueText = 'We aim to provide our customers with exceptional products and services that meet their needs and exceed their expectations.';
  const valueLines = doc.splitTextToSize(valueText, contentWidth - 10);
  doc.text(valueLines, margin, y);
  y += valueLines.length * 5 + 15;

  // Quality Section
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Quality, Reliability, Technology', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const qualityText = `Rayzon solar panels are distinguished by superior components, advanced manufacturing techniques, rigorous quality control, and industry certifications. They sustain high efficiency, resist degradation, and endure diverse environmental conditions. With warranties and adherence to industry standards, Rayzon embraces the latest technology to deliver reliable and cutting-edge solar solutions.`;
  const qualityLines = doc.splitTextToSize(qualityText, contentWidth - 10);
  doc.text(qualityLines, margin, y);
  y += qualityLines.length * 5 + 15;

  // World-Class Testing Facility
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('World-Class Testing Facility', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const testingText = `Our solar panel testing facility stands out for a number of key reasons. abides by international standards, and employs specialists in testing solar panels. It is outfitted with cutting-edge machinery, including advanced solar simulators, climate chambers, and accurate measuring tools, and it offers extensive testing capabilities for performance, durability, safety, quality control, and compliance.`;
  const testingLines = doc.splitTextToSize(testingText, contentWidth - 10);
  doc.text(testingLines, margin, y);
  y += testingLines.length * 5 + 15;

  // Rayzon Green Section
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.primary);
  doc.text('Rayzon Green - The fastest growing Solar EPC Company', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const epcText = `Rayzon Green provides top-notch supplies, tools, and services for projects, collaborating closely with engineering, construction, and project management teams for smooth execution. We employ the latest technology and software tools to enhance project efficiency, integrate sustainable practices, and continually improve engineering procedures. By putting design and plans into action, we transform ideas into tangible results, ensuring that built facilities or systems meet all functional, performance, and quality requirements for project success.`;
  const epcLines = doc.splitTextToSize(epcText, contentWidth - 10);
  doc.text(epcLines, margin, y);

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 5: Solar System Specification
const renderSpecification = (doc, data, company, C = RAYZON_COLORS, pageNum = 5, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'SOLAR SYSTEM', 'SPECIFICATION', 30, C);
  const margin = 20;

  y += 10;

  // Equipment Table - matching RAYZON format
  const equipmentData = data.equipmentItems || data.items || [
    { srNo: 1, equipment: 'SOLAR PV MODULE', description: '625 Wp TopCon Glass-to-Glass Bifacial Module X 208 nos.\nIEC 61215 Edition II and IEC 61730 (including Class II), PID Free, IEC 61701, ALMM & BIS Certified.\nProduct Warranty: 15 years\nPerformance Warranty: 30 Years (90% for first 10 years, 80% for next 20 years.)', make: 'RAYZON (Own Manufacturing)' },
    { srNo: 2, equipment: 'MODULE MOUNTING STRUCTURE', description: 'Fixed Tilt - Hot Dip GI Galvalum superior material for RCC Roof, and Anodised Aluminium rails for sheet/shed type structure with HDGI/SS fasteners', make: 'As per design' },
    { srNo: 3, equipment: 'INVERTER', description: 'Grid Tied String Inverter, with remote monitoring Product warranty : 5 year', make: 'SOLIS' },
    { srNo: 4, equipment: 'DC CABLE', description: '1C X 4 Sq. mm Copper UV protected as per Standards', make: 'Apar' },
    { srNo: 5, equipment: 'AC CABLE', description: '3.5C X xx sq mm al armd cable as per standard', make: 'RR Kabel' },
    { srNo: 6, equipment: 'ACCB PANEL', description: 'MCB/MCCB/ACB of L&T / ABB / SCHNEIDER with protection as per standards', make: 'Reputed Vendors of L&T / ABB / SCHNEIDER' },
    { srNo: 7, equipment: 'EARTHING', description: 'HDGI Earthing Rod 48MM X 2 Mtr (Inner Copper Strip 32x6 MM) with all required components & accessories earthing chamber, Chemical earthing compound', make: 'Reputed' },
    { srNo: 8, equipment: 'LIGHTNING ARRESTOR', description: 'SS ROD(304), 14mm, 1 Meter / ESE type as per the standards as per project capacity', make: 'Global spike/Sabo / JMV / Elink / Reputed' },
    { srNo: 9, equipment: 'BALANCE OF SYSTEM', description: 'Balance of System, As per Standard', make: 'Reputed' },
  ];

  const tableData = equipmentData.map(item => [
    item.srNo.toString(),
    item.equipment,
    item.description,
    item.make
  ]);

  autoTable(doc, {
    startY: y,
    head: [['SR.\nNO.', 'EQUIPMENT', 'DESCRIPTION', 'MAKE']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      font: 'helvetica',
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [180, 180, 180],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 40, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 50, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: margin, right: margin },
  });

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 6: Project Commercials
const renderCommercials = (doc, data, company, C = RAYZON_COLORS, pageNum = 6, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'PROJECT', 'COMMERCIALS', 30, C);
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;

  // Price Schedule label
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Price Schedule', margin, y);

  // Commercial Table
  y += 10;
  const subtotal = data.subtotal || data.equipmentCost + data.installationCost || 3542500;
  const gstAmount = data.gstAmount || Math.round(subtotal * 0.089);
  const total = data.total || subtotal + gstAmount;
  const pricePerKW = Math.round(subtotal / (data.systemCapacity || 130));

  const commercialData = [
    ['A', `Design, Supply, Installation, Testing and Commissioning of ${data.systemCapacity || 130} kWp Rooftop Solar PV Power Plant`, `Rs.${formatCurrency(subtotal)}/-`],
    ['B', `GST @${data.gstRate || 8.9}%`, `Rs.${formatCurrency(gstAmount)}/-`],
    ['C', 'Price per kWp (without GST)', `Rs.${formatCurrency(pricePerKW)}/-`],
    ['D', 'Total EPC Price Including GST', `Rs.${formatCurrency(total)}/-`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['SR.\nNO.', 'DESCRIPTION', 'AMOUNT IN RS.']],
    body: commercialData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 6,
      font: 'helvetica',
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [180, 180, 180],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: margin, right: margin },
  });

  // Notes Section
  y = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Note:', margin, y);

  const notes = [
    { text: 'GEDA charge, connectivity charge and Strengthening charge are extra.', highlight: true },
    { text: 'Solar meter and bi-directional meter purchase, testing and commissioning shall be done by RAYZON SOLAR.', highlight: false },
    { text: 'Installation shall be done as per existing solar policy and any changes in policy Shall be incorporated as applicable', highlight: false },
    { text: 'If DISCOM demand to installed MCCB/ELCB that is not part of solar system and that Was customer scope. The space and ply for the new meter will have to be arranged By the customer.', highlight: false },
    { text: 'Cleaning system is including.', highlight: false },
    { text: 'In This Project, The Subsidy Is Not Applicable.', highlight: true },
    { text: 'This offer is valid for 7 days.', highlight: false },
  ];

  y += 10;
  notes.forEach((note, index) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', note.highlight ? 'bold' : 'normal');
    doc.setTextColor(...(note.highlight ? C.red : C.black));
    const noteLines = doc.splitTextToSize(`${index + 1}. ${note.text}`, pageWidth - margin * 2 - 10);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 3;
  });

  // Payment Terms
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Payment Terms', margin, y);

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const paymentTerms = [
    'Work will start after receipt of PO along with 25% Advance Payment.',
    '70% of the payment before material dispatch intimation on pro-rata basis.',
    '5% payment within 7 days of successful commissioning of project',
  ];

  paymentTerms.forEach(term => {
    doc.text('.', margin, y);
    const termLines = doc.splitTextToSize(term, pageWidth - margin * 2 - 15);
    doc.text(termLines, margin + 8, y);
    y += Math.max(termLines.length * 5, 8) + 3;
  });

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 7: Project Execution & Scope
const renderExecutionScope = (doc, data, company, C = RAYZON_COLORS, pageNum = 7, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'PROJECT', 'EXECUTION & SCOPE', 30, C);
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;

  // Delivery Period
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Delivery Period', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.text('Duration of 2 months shall be sufficient for completion of proposed Solar PV Power Plant', margin, y);

  const deliveryPoints = [
    'The specified deadline begins on the date of work order acceptance by Rayzon and advance payment by client.',
    'Deadlines shall be extended by a reasonable period if amendments or additions are made to the contract and delays caused on account of (i) Force Majeure, (ii) Wilful delay by the contracting parties or (iii) upon non fulfilment of payment obligations by the Customer.',
    'Specified dates and deadlines shall be binding on a condition that they are agreed in writing. Strikes, lock-out, acts of state/God, traffic disruptions and other unusual circumstances shall exempt the duration of impact from providing the services.',
    'If dispatch / installation is delayed upon request or due to circumstances for which the Customer owns responsibility, Rayzon reserves its rights to charge to the Customer the costs incurred for storage for each delayed day, commencing fifteen (15) days after notification of readiness to dispatch/install.',
  ];

  y += 12;
  deliveryPoints.forEach((point, index) => {
    doc.text(`${index + 1}.`, margin, y);
    const pointLines = doc.splitTextToSize(point, pageWidth - margin * 2 - 15);
    doc.text(pointLines, margin + 10, y);
    y += pointLines.length * 5 + 3;
  });

  // Scope of Work by Rayzon Solar
  y += 15;
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.primary);
  doc.text('Scope of Work by Rayzon Solar', margin, y);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const rayzonScope = [
    'Detail Site analysis, design of system including civil, structural, electrical and mechanical components, with required drawings',
    'Supply and Installation of complete system with required protection for optimal energy output, best reliability and stability',
    'Providing FRP walkway, GI Walkway, peripheral safety railing as per design.',
    'Output Power @ 415 V ready for evacuation',
    'Liaisoning for all approval and clearances with net metering',
    'Execution of project with all standard safety measures',
    'Transportation, packaging, forwarding, transit insurance and all site related risk insurance during project execution term only has been included in the above price',
  ];

  rayzonScope.forEach(scope => {
    doc.text('.', margin, y);
    const scopeLines = doc.splitTextToSize(scope, pageWidth - margin * 2 - 15);
    doc.text(scopeLines, margin + 8, y);
    y += scopeLines.length * 5 + 2;
  });

  // Scope of Work by Client
  y += 15;
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Scope of Work by Client', margin, y);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const clientScope = [
    'Spare MCCB/feeder/switch if needed for termination',
    'Providing encumbrance free area for Solar PV Plant installation',
    'Provide wifi/sim-card for online monitoring',
    'Availability of pressurized water at the roof',
    'Provide all necessary drawings & documents for Solar plant installation',
    'Proper & safe storage space for material & tools',
    { text: "The ladder required to access the roof is to be provided by the client, as it is under the client's scope.", highlight: true },
  ];

  clientScope.forEach(scope => {
    const isObject = typeof scope === 'object';
    const text = isObject ? scope.text : scope;
    const highlight = isObject ? scope.highlight : false;

    doc.setTextColor(...(highlight ? C.red : C.black));
    doc.text('.', margin, y);
    const scopeLines = doc.splitTextToSize(text, pageWidth - margin * 2 - 15);
    doc.text(scopeLines, margin + 8, y);
    y += scopeLines.length * 5 + 2;
  });

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 8: O&M and Warranty
const renderWarranty = (doc, data, company, C = RAYZON_COLORS, pageNum = 8, totalPages = 9) => {
  let y = drawSectionHeader(doc, 'PROJECT', 'O&M AND WARRANTY', 30, C);
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;

  // Operation & Maintenance
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Operation & Maintenance', margin, y);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const introText = 'The O&M support for first 5 years after commissioning is included in the price with further conditions as mentioned below:';
  const introLines = doc.splitTextToSize(introText, pageWidth - margin * 2);
  doc.text(introLines, margin, y);

  const omPoints = [
    'All prices associated with design related defects shall be borne by Rayzon during this one-year period (Defect Liability Period). For any replacement in spares which is not covered in warranty will be charged at actuals after completion of 1st year.',
    'Rayzon will continuously monitor the SPV power system and periodically inspect it including quarterly mandatory visit to the site.',
    'Cleaning of solar modules shall be done by client. Water and electricity requirements for the purpose of cleaning of solar modules shall fall under the responsibility of the Client.',
    'It is requested to the client that water connection should be there on the rooftop of the solar power installed roof for the ease of O&M.',
  ];

  y += introLines.length * 5 + 8;
  omPoints.forEach(point => {
    doc.text('.', margin, y);
    const pointLines = doc.splitTextToSize(point, pageWidth - margin * 2 - 15);
    doc.text(pointLines, margin + 8, y);
    y += pointLines.length * 5 + 3;
  });

  // Warranty Terms
  y += 15;
  doc.setFont('helvetica', 'underline');
  doc.setTextColor(...C.textGray);
  doc.text('Warranty Terms:', margin, y);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  const warrantyPoints = [
    { text: 'Solar Module Warranty: 30 Years Performance Warranty on Solar Panels in Power Output of 90% generation for first 10 years & 80% generation up to 30 years.', underline: true },
    { text: 'Inverter Warranty: Inverter defect warranty up to 5 or 7 years as per Inverter supplier.', underline: true },
    'Complete plant system warranty shall be of 1 year',
    'Other warranty and guarantees as given by equipment supplier\'s standard terms and condition.',
    'We offer system warranty for achieving the committed generation figures, on the basis of horizontal global irradiance at site, at a Performance ratio of minimum 75%. The generation guarantee of system is subject to:\n  i) The solar insolation level at site remaining in the acceptable range\n  ii) Grid being available for acceptable durations\n  iii) Non-existence of Force Majeure events.',
  ];

  warrantyPoints.forEach(warranty => {
    const isObject = typeof warranty === 'object';
    const text = isObject ? warranty.text : warranty;
    const underline = isObject ? warranty.underline : false;

    doc.setFont('helvetica', underline ? 'bold' : 'normal');
    doc.text('.', margin, y);
    const warrantyLines = doc.splitTextToSize(text, pageWidth - margin * 2 - 15);
    doc.text(warrantyLines, margin + 8, y);
    y += warrantyLines.length * 5 + 3;
  });

  drawPageFooter(doc, pageNum, totalPages);
};

// PAGE 9: Back Cover
const renderBackCover = (doc, data, company, C = RAYZON_COLORS, pageNum = 9, totalPages = 9) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Solar worker image area (top 55%)
  doc.setFillColor(100, 150, 200);
  doc.rect(0, 0, pageWidth, pageHeight * 0.55, 'F');

  // Curved white transition
  doc.setFillColor(...C.white);
  doc.ellipse(pageWidth / 2, pageHeight * 0.53, pageWidth, 35, 'F');

  // Logo at top right
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('RAYZON', pageWidth - 100, 40);
  doc.setFontSize(14);
  doc.text('GREEN', pageWidth - 30, 40);

  // Company info sections
  const infoY = pageHeight * 0.62;
  const col1X = 20;
  const col2X = pageWidth / 2 + 15;

  // Left Column - Rayzon Green
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('RAYZON GREEN PVT.LTD.', col1X, infoY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textGray);

  let leftY = infoY + 12;

  doc.setFillColor(...C.primary);
  doc.circle(col1X + 3, leftY - 2, 3, 'F');
  doc.text(company.address, col1X + 12, leftY);
  leftY += 5;
  doc.text(company.city, col1X + 12, leftY);
  leftY += 12;

  doc.setFillColor(...C.primary);
  doc.circle(col1X + 3, leftY - 2, 3, 'F');
  doc.text(`Tollfree No. ${company.tollfree}`, col1X + 12, leftY);
  leftY += 5;
  doc.text(company.phone, col1X + 12, leftY);
  leftY += 12;

  doc.setFillColor(...C.primary);
  doc.circle(col1X + 3, leftY - 2, 3, 'F');
  doc.text(company.email, col1X + 12, leftY);
  leftY += 12;

  doc.setFillColor(...C.primary);
  doc.circle(col1X + 3, leftY - 2, 3, 'F');
  doc.text(company.website, col1X + 12, leftY);

  // Vertical divider line
  doc.setDrawColor(...C.mediumGray);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2, infoY - 5, pageWidth / 2, infoY + 70);

  // Right Column - Manufacturing Unit
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textGray);
  doc.text('Manufacturing Unit', col2X, infoY);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('RAYZON SOLAR PVT.LTD.', col2X, infoY + 10);

  let rightY = infoY + 25;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textGray);

  doc.setFillColor(...C.primary);
  doc.circle(col2X + 3, rightY - 2, 3, 'F');
  doc.text(company.manufacturingAddress.substring(0, 45), col2X + 12, rightY);
  doc.text(company.manufacturingAddress.substring(45), col2X + 12, rightY + 5);
  rightY += 15;

  doc.setFillColor(...C.primary);
  doc.circle(col2X + 3, rightY - 2, 3, 'F');
  doc.text(company.manufacturingEmail, col2X + 12, rightY);
  rightY += 12;

  doc.setFillColor(...C.primary);
  doc.circle(col2X + 3, rightY - 2, 3, 'F');
  doc.text(company.manufacturingWebsite, col2X + 12, rightY);

  drawPageFooter(doc, pageNum, totalPages);
};

// ============================================================
// QUOTATION PDF GENERATOR - Professional Format
// ============================================================

const renderQuotationHeader = (doc, company, C) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Header Bar
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company Name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('SUNVORA GREEN PVT. LTD.', margin, 22);

  // Contact Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${company.phone} | ${company.tollfree}`, pageWidth - margin, 15, { align: 'right' });
  doc.text(`${company.email} | ${company.website}`, pageWidth - margin, 22, { align: 'right' });

  // Teal accent bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 35, pageWidth, 3, 'F');
};

const renderQuotationFooter = (doc, pageNum, totalPages, company, C) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Bottom bar
  doc.setFillColor(...C.primary);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

  // Footer text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.white);
  doc.text('Thank you for choosing Sunvora Green Pvt. Ltd. - Best Value & Quality Solar Solution', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Page number
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 20, pageHeight - 6, { align: 'right' });
};

const renderQuotationBody = (doc, data, company, C) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let y = 50;

  const drawRightFittedText = (text, xRight, yPos, maxWidth, baseFontSize, fontStyle = 'bold') => {
    const originalSize = doc.getFontSize();
    const originalFont = doc.getFont();
    let size = baseFontSize;
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(size);
    while (size > 6 && doc.getTextWidth(String(text)) > maxWidth) {
      size -= 0.5;
      doc.setFontSize(size);
    }
    doc.text(String(text), xRight, yPos, { align: 'right' });
    doc.setFont(originalFont.fontName, originalFont.fontStyle);
    doc.setFontSize(originalSize);
  };

  // Document Title - ESTIMATE on right side
  const estimateX = pageWidth - margin - 70;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...C.primary);
  doc.roundedRect(estimateX, y - 5, 70, 42, 3, 3, 'FD');

  // Teal accent bar on left
  doc.setFillColor(...C.primary);
  doc.rect(estimateX, y - 5, 6, 42, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('ESTIMATE', estimateX + 12, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(`#${data.quotationNumber || data.proposalNumber || 'EST-2026-0001'}`, estimateX + 12, y + 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`Date: ${data.quotationDate || today}`, estimateX + 12, y + 26);
  doc.text(`Valid: 30 days`, estimateX + 12, y + 33);

  y += 45;

  // Section Title - CUSTOMER DETAILS
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('CUSTOMER DETAILS', margin, y);
  y += 8;

  // Customer Details Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text(data.customerName || 'ABC Corporation', margin + 5, y + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.customerName || 'ABC Corp Ltd', margin + 5, y + 18);
  doc.text(data.customerAddress || '123 Business Park, Mumbai', margin + 5, y + 26);
  doc.text(`Project Location: ${data.projectLocation || 'Mumbai, Maharashtra'}`, margin + 5, y + 32);

  y += 45;

  // Section Title - PROJECT DETAILS
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('PROJECT DETAILS', margin, y);
  y += 8;

  // Project Details Box
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, 'FD');

  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Project Name:', col1X, y + 8);
  doc.text('System Capacity:', col2X, y + 8);
  doc.text('Project Type:', col1X, y + 16);
  doc.text('Installation:', col2X, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.projectName || '5kW Rooftop Solar Installation', col1X + 30, y + 8);
  doc.text(`${data.systemCapacity || 5} kW`, col2X + 30, y + 8);
  doc.text('Commercial', col1X + 30, y + 16);
  doc.text('Rooftop', col2X + 30, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);
  doc.text('Description:', col1X, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Grid-tied solar system for office building', col1X + 25, y + 24);

  y += 40;

  // Section Title - EQUIPMENT & MATERIALS
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('EQUIPMENT & MATERIALS', margin, y);
  y += 8;

  // Equipment table (autoTable prevents row overlap/mixing)
  const tableWidth = pageWidth - margin * 2;
  const tableStartY = y;
  let subtotal = 0;

  const items = (data.items && Array.isArray(data.items) && data.items.length > 0)
    ? data.items
    : [
      { name: 'Solar Panel 550W', description: 'Waaree WS-550 - High efficiency monocrystalline', quantity: 10, unitPrice: 11500 },
      { name: 'String Inverter 5kW', description: 'Growatt MAX 50KTL3 LV - 3-phase grid-tied inverter', quantity: 1, unitPrice: 16500 },
      { name: 'Mounting Structure', description: 'Sterling SS RF-01 - Aluminum structure with clamps', quantity: 1, unitPrice: 32500 },
      { name: 'DC Cable 4mm', description: 'Polycab PV-4MM - Solar DC cable 100m', quantity: 1, unitPrice: 11200 },
      { name: 'AC Cable 6mm', description: 'Polycab AC-6MM - AC cable 50m', quantity: 1, unitPrice: 18000 },
      { name: 'Earthing Kit', description: 'Generic EARTH-01 - Complete earthing system', quantity: 1, unitPrice: 11500 },
      { name: 'Lightning Arrestor', description: 'Phoenix LA-100 - Class B surge protection', quantity: 1, unitPrice: 11100 },
    ];

  const tableBody = items.map((item) => {
    const qty = Number(item?.quantity ?? 0);
    const unitPrice = Number(item?.unitPrice ?? 0);
    const amount = qty * unitPrice;
    subtotal += amount;
    return [
      String(item?.name ?? ''),
      String(item?.description ?? ''),
      String(qty),
      `₹${unitPrice.toLocaleString('en-IN')}`,
      `₹${amount.toLocaleString('en-IN')}`,
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [['Item', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'grid',
    tableWidth,
    margin: { left: margin, right: pageWidth - (margin + tableWidth) },
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.6,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      overflow: 'linebreak',
      valign: 'top',
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: C.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 60 },
      2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return;
      if (hookData.column.index !== 3 && hookData.column.index !== 4) return;

      const text = Array.isArray(hookData.cell.text) ? hookData.cell.text.join(' ') : String(hookData.cell.text ?? '');
      const padding = (hookData.cell.styles.cellPadding ?? 0);
      const maxWidth = hookData.cell.width - padding * 2;

      // shrink font size until it fits the numeric cell width
      let size = hookData.cell.styles.fontSize ?? 6.5;
      const originalFont = doc.getFont();
      while (size > 5) {
        doc.setFont('helvetica', hookData.cell.styles.fontStyle || 'normal');
        doc.setFontSize(size);
        if (doc.getTextWidth(text) <= maxWidth) break;
        size -= 0.5;
      }
      hookData.cell.styles.fontSize = size;
      doc.setFont(originalFont.fontName, originalFont.fontStyle);
    },
  });

  const tableEndY = doc.lastAutoTable?.finalY ?? (tableStartY + 10);
  y = tableEndY + 6;

  // Move Cost Summary + signature to next page to avoid any overlap with long equipment tables
  doc.addPage();
  renderQuotationHeader(doc, company, C);
  y = 50;

  // COST SUMMARY (full width on new page)
  const summaryWidth = pageWidth - margin * 2;
  const summaryX = margin;
  const summaryY = y;

  // Summary Header
  doc.setFillColor(...C.primary);
  doc.roundedRect(summaryX, summaryY, summaryWidth, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COST SUMMARY', summaryX + summaryWidth / 2, summaryY + 8, { align: 'center' });

  // Summary Body
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(summaryX, summaryY + 12, summaryWidth, 75, 2, 2, 'FD');

  const equipmentCost = subtotal;
  const installationCost = Math.round(subtotal * 0.15);
  const engineeringCost = Math.round(subtotal * 0.08);
  const transportation = Math.round(subtotal * 0.03);
  const miscellaneous = Math.round(subtotal * 0.02);
  const gstRate = data.gstRate || 18;
  const totalBeforeGst = equipmentCost + installationCost + engineeringCost + transportation + miscellaneous;
  const gstAmount = Math.round(totalBeforeGst * gstRate / 100);
  const grandTotal = totalBeforeGst + gstAmount;

  let sy = summaryY + 22;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  doc.text('Equipment Cost:', summaryX + 5, sy);
  drawRightFittedText(`₹${equipmentCost.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 8;

  doc.text('Installation Cost:', summaryX + 5, sy);
  drawRightFittedText(`₹${installationCost.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 8;

  doc.text('Engineering Cost:', summaryX + 5, sy);
  drawRightFittedText(`₹${engineeringCost.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 8;

  doc.text('Transportation:', summaryX + 5, sy);
  drawRightFittedText(`₹${transportation.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 8;

  doc.text('Miscellaneous:', summaryX + 5, sy);
  drawRightFittedText(`₹${miscellaneous.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 10;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX + 5, sy - 3, summaryX + summaryWidth - 5, sy - 3);

  doc.text('Subtotal:', summaryX + 5, sy);
  drawRightFittedText(`₹${totalBeforeGst.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 8;

  doc.text(`GST (${gstRate}%):`, summaryX + 5, sy);
  drawRightFittedText(`₹${gstAmount.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy, 55, 8.5, 'bold');
  sy += 10;

  // Grand Total Box
  doc.setFillColor(212, 167, 40); // Gold color
  doc.roundedRect(summaryX, sy - 5, summaryWidth, 15, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', summaryX + 5, sy + 5);
  drawRightFittedText(`₹${grandTotal.toLocaleString('en-IN')}`, summaryX + summaryWidth - 8, sy + 5, 70, 10, 'bold');

  // Move y to after summary
  const summaryEndY = summaryY + 12 + 75;
  y = summaryEndY + 20;

  // TERMS & CONDITIONS
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('TERMS & CONDITIONS', margin, y);
  y += 8;

  // Terms Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('50% advance, 50% on completion. 5 year warranty on installation.', margin + 5, y + 10);
  doc.text('Net metering application to be done by client', margin + 5, y + 18);

  y += 35;

  // NOTES
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('NOTES', margin, y);
  y += 8;

  // Notes Box - Yellow/Cream background
  doc.setFillColor(255, 248, 235);
  doc.setDrawColor(230, 200, 150);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 90, 50);
  doc.text('Net metering application to be done by client', margin + 5, y + 10);

  y += 30;

  // Signature Area
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const pageHeight = doc.internal.pageSize.height;
  const signatureBlockHeight = 18;
  const footerReserved = 25;
  const signatureY = Math.min(y + 15, pageHeight - footerReserved - signatureBlockHeight);

  doc.text('Authorized Signature', margin, signatureY + 8);
  doc.text('Customer Acceptance', pageWidth - margin - 40, signatureY + 8);

  doc.setDrawColor(150, 150, 150);
  doc.line(margin, signatureY + 5, margin + 45, signatureY + 5);
  doc.line(pageWidth - margin - 45, signatureY + 5, pageWidth - margin, signatureY + 5);

  doc.setFontSize(8);
  doc.text('For Sunvora Energy Pvt. Ltd.', margin, signatureY + 13);
  doc.text('Date & Stamp', pageWidth - margin - 40, signatureY + 13);
};

export const generateQuotationPDF = (data, company = COMPANY_DATA) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const C = RAYZON_COLORS;

  renderQuotationHeader(doc, company, C);
  renderQuotationBody(doc, data, company, C);

  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
    doc.setPage(pageNum);
    renderQuotationFooter(doc, pageNum, totalPages, company, C);
  }

  return doc.output('blob');
};

export const downloadQuotationPDF = (data, company, filename) => {
  const blob = generateQuotationPDF(data, company);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Quotation_${data.quotationNumber || data.proposalNumber || Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================
// MAIN PDF GENERATOR
// ============================================================

export const generateRayzonPDF = (data, company = COMPANY_DATA) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalPages = 9;

  // Page 1: Cover (no addPage needed for first page)
  renderCoverPage(doc, data, company);

  // Page 2: Executive Summary
  doc.addPage();
  renderExecutiveSummary(doc, data, company, RAYZON_COLORS, 2, totalPages);

  // Page 3: General Information
  doc.addPage();
  renderGeneralInformation(doc, data, company, RAYZON_COLORS, 3, totalPages);

  // Page 4: Why Rayzon Solar
  doc.addPage();
  renderWhyRayzon(doc, data, company, RAYZON_COLORS, 4, totalPages);

  // Page 5: Solar System Specification
  doc.addPage();
  renderSpecification(doc, data, company, RAYZON_COLORS, 5, totalPages);

  // Page 6: Project Commercials
  doc.addPage();
  renderCommercials(doc, data, company, RAYZON_COLORS, 6, totalPages);

  // Page 7: Project Execution & Scope
  doc.addPage();
  renderExecutionScope(doc, data, company, RAYZON_COLORS, 7, totalPages);

  // Page 8: O&M and Warranty
  doc.addPage();
  renderWarranty(doc, data, company, RAYZON_COLORS, 8, totalPages);

  // Page 9: Back Cover
  doc.addPage();
  renderBackCover(doc, data, company, RAYZON_COLORS, 9, totalPages);

  return doc.output('blob');
};

// Download Function
export const downloadRayzonPDF = (data, company, filename) => {
  const blob = generateRayzonPDF(data, company);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Proposal_${data.proposalNumber || data.serialNo || Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================================
// BACKWARD COMPATIBILITY & EXPORTS
// ============================================================

export const generateCustomPDF = generateRayzonPDF;
export const downloadCustomPDF = downloadRayzonPDF;

// Re-export TEMPLATE_CONFIG for backward compatibility
export const TEMPLATE_CONFIG = {
  // Page Settings
  page: {
    format: 'a4',
    orientation: 'portrait',
    marginTop: 15,
    marginBottom: 25,
    marginLeft: 15,
    marginRight: 15,
  },

  // Color Scheme
  colors: {
    primary: [0, 102, 102],      // Teal
    primaryDark: [0, 77, 77],
    primaryLight: [0, 128, 128],
    accent: [255, 193, 7],       // Gold
    secondary: [51, 51, 51],
    lightGray: [245, 245, 245],
    mediumGray: [160, 160, 160],
    white: [255, 255, 255],
    black: [0, 0, 0],
    textGray: [80, 80, 80],
    tableHeader: [180, 180, 180],
    red: [220, 53, 69],
  },

  // Typography
  fonts: {
    header: { family: 'helvetica', style: 'bold', size: 20 },
    subheader: { family: 'helvetica', style: 'bold', size: 14 },
    body: { family: 'helvetica', style: 'normal', size: 10 },
    small: { family: 'helvetica', style: 'normal', size: 8 },
  },

  // Section Toggles
  sections: {
    header: true,
    companyLogo: true,
    documentInfo: true,
    clientCard: true,
    itemsTable: true,
    pricingSummary: true,
    notes: true,
    terms: true,
    footer: true,
    signature: true,
    stamp: true,
    pageNumbers: true,
  },

  // Section Ordering
  sectionOrder: ['header', 'clientCard', 'itemsTable', 'pricingSummary', 'notes', 'footer'],

  // Styling Options
  style: {
    borderRadius: 3,
    tableBorder: true,
    alternatingRows: true,
    cardStyle: 'rounded',
    headerStyle: 'bar',
    accentLine: true,
  },

  // Table Configuration
  table: {
    headerColor: 'primary',
    headerTextColor: 'white',
    rowHeight: 8,
    fontSize: 9,
    borderColor: [220, 220, 220],
    alternateRowColor: [250, 250, 250],
    columns: {
      srNo: { width: 12, align: 'center', title: 'Sr No' },
      itemName: { width: 40, align: 'left', title: 'Item Name' },
      description: { width: 'auto', align: 'left', title: 'Description' },
      quantity: { width: 15, align: 'center', title: 'Qty' },
      unitPrice: { width: 25, align: 'right', title: 'Unit Price' },
      total: { width: 25, align: 'right', title: 'Total' },
    }
  },

  // Logo Settings
  logo: {
    enabled: true,
    type: 'icon',
    icon: 'solar',
    size: 20,
    position: 'left',
  },

  // Footer Message
  footer: {
    thankYouMessage: 'Thank you for choosing Sunvora Energy!',
    showWebsite: true,
    showEmail: true,
    showPhone: true,
  }
};

// Default export
export default {
  generateRayzonPDF,
  downloadRayzonPDF,
  generateCustomPDF,
  downloadCustomPDF,
  generateQuotationPDF,
  downloadQuotationPDF,
  RAYZON_COLORS,
  COMPANY_DATA,
};
