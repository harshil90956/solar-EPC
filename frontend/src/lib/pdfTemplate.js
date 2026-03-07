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
  let y = 55;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('QUOTATION', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Quotation Info Box
  doc.setFillColor(...C.lightGray);
  doc.rect(margin, y, pageWidth - margin * 2, 25, 'F');

  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);

  doc.text('Quotation No:', col1X, y + 8);
  doc.text('Date:', col1X, y + 16);
  doc.text('Valid Until:', col1X, y + 23);

  doc.setFont('helvetica', 'normal');
  const quoteNum = data.quotationNumber || data.proposalNumber || `QTN-${Date.now().toString().slice(-6)}`;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.text(quoteNum, col1X + 35, y + 8);
  doc.text(data.quotationDate || today, col1X + 35, y + 16);
  doc.text(data.validUntil || validDate, col1X + 35, y + 23);

  doc.setFont('helvetica', 'bold');
  doc.text('Project:', col2X, y + 8);
  doc.text('Capacity:', col2X, y + 16);
  doc.text('Location:', col2X, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.text(data.projectName || 'Solar PV Installation', col2X + 30, y + 8);
  doc.text(`${data.systemCapacity || 130} kWp`, col2X + 30, y + 16);
  doc.text(data.projectLocation || 'Surat, Gujarat', col2X + 30, y + 23);

  y += 35;

  // Client Details
  doc.setFillColor(235, 245, 245);
  doc.rect(margin, y, (pageWidth - margin * 2) / 2 - 5, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('QUOTATION TO:', margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.text(data.customerName || 'Client Name', margin + 5, y + 18);
  doc.text(data.customerAddress || 'Client Address', margin + 5, y + 26);
  doc.text(`Contact: ${data.customerPhone || ''}`, margin + 5, y + 34);

  // Company Details
  doc.setFillColor(235, 245, 245);
  doc.rect(pageWidth / 2 + 5, y, (pageWidth - margin * 2) / 2 - 5, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('FROM:', pageWidth / 2 + 10, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.text(company.name, pageWidth / 2 + 10, y + 18);
  doc.text(company.address, pageWidth / 2 + 10, y + 26);
  doc.text(company.phone, pageWidth / 2 + 10, y + 34);

  y += 50;

  // Items Table Header
  doc.setFillColor(180, 180, 180);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  const colWidths = [12, 65, 15, 25, 25];
  const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2], margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]];

  doc.text('Sr.', colPositions[0] + 3, y + 6);
  doc.text('Item Description', colPositions[1] + 3, y + 6);
  doc.text('Qty', colPositions[2] + 3, y + 6);
  doc.text('Rate', colPositions[3] + 3, y + 6);
  doc.text('Amount', colPositions[4] + 3, y + 6);

  // Table Rows
  y += 12;
  const items = data.items || [
    { description: 'Solar PV Module 625Wp TopCon Bifacial', quantity: 208, unitPrice: 12500 },
    { description: 'Module Mounting Structure HDGI', quantity: 1, unitPrice: 45000 },
    { description: 'Grid Tie Inverter 100kW String', quantity: 1, unitPrice: 185000 },
    { description: 'DC Cable 4 sq.mm UV Protected', quantity: 500, unitPrice: 85 },
    { description: 'AC Cable 3.5C x 70 sq.mm', quantity: 100, unitPrice: 320 },
    { description: 'Earthing Kit HDGI', quantity: 4, unitPrice: 8500 },
    { description: 'Lightning Arrestor ESE', quantity: 2, unitPrice: 12500 },
    { description: 'Installation & Commissioning', quantity: 1, unitPrice: 85000 },
  ];

  let subtotal = 0;

  items.forEach((item, index) => {
    const amount = item.quantity * item.unitPrice;
    subtotal += amount;

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 10, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.black);

    doc.text((index + 1).toString(), colPositions[0] + 3, y);
    doc.text(item.description, colPositions[1] + 3, y);
    doc.text(item.quantity.toString(), colPositions[2] + 3, y);
    doc.text(`₹${item.unitPrice.toLocaleString('en-IN')}`, colPositions[3] + 3, y);
    doc.text(`₹${amount.toLocaleString('en-IN')}`, colPositions[4] + 3, y);

    y += 10;
  });

  // Summary Box
  y += 10;
  const summaryX = pageWidth - margin - 80;

  doc.setFillColor(...C.lightGray);
  doc.rect(summaryX, y, 80, 50, 'F');

  const gstRate = data.gstRate || 8.9;
  const gstAmount = Math.round(subtotal * gstRate / 100);
  const total = subtotal + gstAmount;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.black);

  doc.text('Subtotal:', summaryX + 5, y + 10);
  doc.text(`₹${subtotal.toLocaleString('en-IN')}`, summaryX + 75, y + 10, { align: 'right' });

  doc.text(`GST (${gstRate}%):`, summaryX + 5, y + 20);
  doc.text(`₹${gstAmount.toLocaleString('en-IN')}`, summaryX + 75, y + 20, { align: 'right' });

  doc.setFillColor(...C.primary);
  doc.rect(summaryX, y + 30, 80, 20, 'F');

  doc.setTextColor(...C.white);
  doc.text('Total:', summaryX + 5, y + 42);
  doc.text(`₹${total.toLocaleString('en-IN')}`, summaryX + 75, y + 42, { align: 'right' });

  // Terms & Notes
  y += 65;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  doc.text('Terms & Conditions:', margin, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.setFontSize(8);

  const terms = [
    '1. Work will start after receipt of PO with 25% advance.',
    '2. 70% payment before material dispatch on pro-rata basis.',
    '3. 5% payment within 7 days of successful commissioning.',
    '4. GEDA charge, connectivity charge are extra.',
    '5. Subsidy is not applicable in this project.',
    '6. Cleaning system is included.',
    '7. This offer is valid for 7 days.',
  ];

  terms.forEach(term => {
    doc.text(term, margin, y);
    y += 6;
  });

  // Signature Area
  y = 270;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.black);
  doc.setFontSize(9);

  doc.text('Authorized Signature', margin, y);
  doc.text('Customer Acceptance', pageWidth - margin - 40, y);

  doc.setDrawColor(...C.mediumGray);
  doc.line(margin, y - 5, margin + 50, y - 5);
  doc.line(pageWidth - margin - 50, y - 5, pageWidth - margin, y - 5);

  doc.setFontSize(8);
  doc.text('For Sunvora Green Pvt. Ltd.', margin, y + 6);
  doc.text('Signature & Stamp', pageWidth - margin - 40, y + 6);
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
  renderQuotationFooter(doc, 1, 1, company, C);

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
// BACKWARD COMPATIBILITY
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
