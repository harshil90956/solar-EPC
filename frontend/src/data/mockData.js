// Solar OS – EPC Edition – Mock Data Store (config-driven, no hardcoded enums in components)

export const USERS = [
  { id: 1, name: 'Admin User', email: 'admin@solarcorp.com', password: 'admin123', role: 'Admin', avatar: 'AU', department: 'Management' },
  { id: 2, name: 'Ravi Sharma', email: 'sales@solarcorp.com', password: 'sales123', role: 'Sales', avatar: 'RS', department: 'Sales' },
  { id: 3, name: 'Priya Patel', email: 'survey@solarcorp.com', password: 'survey123', role: 'Survey Engineer', avatar: 'PP', department: 'Engineering' },
  { id: 4, name: 'Arjun Mehta', email: 'design@solarcorp.com', password: 'design123', role: 'Design Engineer', avatar: 'AM', department: 'Engineering' },
  { id: 5, name: 'Neha Gupta', email: 'pm@solarcorp.com', password: 'pm123', role: 'Project Manager', avatar: 'NG', department: 'Projects' },
  { id: 6, name: 'Vikram Singh', email: 'store@solarcorp.com', password: 'store123', role: 'Store Manager', avatar: 'VS', department: 'Operations' },
  { id: 7, name: 'Sunita Rao', email: 'finance@solarcorp.com', password: 'finance123', role: 'Finance', avatar: 'SR', department: 'Finance' },
  { id: 8, name: 'Kiran Tech', email: 'tech@solarcorp.com', password: 'tech123', role: 'Technician', avatar: 'KT', department: 'Field' },
  { id: 9, name: 'Rahul Joshi', email: 'procurement@solarcorp.com', password: 'procure123', role: 'Procurement Officer', avatar: 'RJ', department: 'Operations' },
  { id: 10, name: 'Sneha Kapoor', email: 'service@solarcorp.com', password: 'service123', role: 'Service Manager', avatar: 'SK', department: 'Service' },
];

// ── Extended Lead Pipeline Stages ──
export const PIPELINE_STAGES = [
  { id: 'new', label: 'New', color: '#64748b', prob: 10 },
  { id: 'contacted', label: 'Contacted', color: '#3b82f6', prob: 25 },
  { id: 'qualified', label: 'Qualified', color: '#8b5cf6', prob: 45 },
  { id: 'survey', label: 'Site Survey Scheduled', color: '#f59e0b', prob: 60 },
  { id: 'proposal', label: 'Proposal Sent', color: '#f97316', prob: 75 },
  { id: 'negotiation', label: 'Negotiation', color: '#ec4899', prob: 85 },
  { id: 'won', label: 'Won', color: '#22c55e', prob: 100 },
  { id: 'lost', label: 'Lost', color: '#ef4444', prob: 0 },
];

export const LEADS = [
  {
    id: 'L001', name: 'Ramesh Joshi', company: 'Joshi Industries', phone: '9876543210', email: 'ramesh@joshi.com',
    source: 'Website', stage: 'proposal', score: 87, assignedTo: 'Ravi Sharma', kw: '50kW', value: 280000,
    age: 3, city: 'Ahmedabad', state: 'Gujarat', created: '2026-02-20', lastContact: '2026-02-24',
    monthlyBill: 45000, roofArea: 500, roofType: 'RCC Flat', budget: 300000, category: 'Commercial',
    tags: ['High Budget', 'Fast Close'], lat: 23.0225, lng: 72.5714,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-24 10:30', note: 'Discussed proposal details. Customer happy with pricing.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'whatsapp', ts: '2026-02-23 15:00', note: 'Sent brochure and system sizing document.', by: 'Ravi Sharma' },
      { id: 'a3', type: 'email', ts: '2026-02-22 09:00', note: 'Sent proposal Q001. Valid till March 23.', by: 'Ravi Sharma' },
      { id: 'a4', type: 'note', ts: '2026-02-20 14:00', note: 'Lead came through website enquiry form. Interested in 50kW rooftop.', by: 'Admin User' },
    ],
    nextFollowUp: '2026-02-27', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L002', name: 'Sunita Malhotra', company: 'Malhotra Textiles', phone: '9765432109', email: 'sunita@malhotra.com',
    source: 'Referral', stage: 'survey', score: 72, assignedTo: 'Ravi Sharma', kw: '100kW', value: 560000,
    age: 7, city: 'Surat', state: 'Gujarat', created: '2026-02-16', lastContact: '2026-02-22',
    monthlyBill: 85000, roofArea: 1000, roofType: 'Industrial Shed', budget: 600000, category: 'Industrial',
    tags: ['Referral', 'Large System'], lat: 21.1702, lng: 72.8311,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-22 11:00', note: 'Survey scheduled for Feb 26.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'email', ts: '2026-02-18 09:30', note: 'Sent initial proposal and company profile.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-26', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L003', name: 'Amitabh Verma', company: 'Verma Cold Storage', phone: '9654321098', email: 'amitabh@verma.com',
    source: 'Campaign', stage: 'contacted', score: 34, assignedTo: 'Ravi Sharma', kw: '25kW', value: 140000,
    age: 15, city: 'Rajkot', state: 'Gujarat', created: '2026-02-08', lastContact: '2026-02-15',
    monthlyBill: 22000, roofArea: 250, roofType: 'RCC Flat', budget: 150000, category: 'Commercial',
    tags: ['Campaign', 'Low Engagement'], lat: 22.3039, lng: 70.8022,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-15 14:00', note: 'No response. Will try again.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'email', ts: '2026-02-10 10:00', note: 'Intro email sent from Google Ads campaign.', by: 'Admin User' },
    ],
    nextFollowUp: '2026-02-27', slaHours: 24, slaBreached: true,
  },
  {
    id: 'L004', name: 'Deepika Shah', company: 'Shah Motors', phone: '9543210987', email: 'deepika@shah.com',
    source: 'Walk-in', stage: 'negotiation', score: 91, assignedTo: 'Ravi Sharma', kw: '75kW', value: 420000,
    age: 2, city: 'Vadodara', state: 'Gujarat', created: '2026-02-21', lastContact: '2026-02-25',
    monthlyBill: 68000, roofArea: 750, roofType: 'RCC Flat', budget: 450000, category: 'Commercial',
    tags: ['Walk-in', 'Hot', 'Fast Close'], lat: 22.3072, lng: 73.1812,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-25 16:00', note: 'Negotiating 5% discount on total value. Decision by Feb 28.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'whatsapp', ts: '2026-02-24 12:00', note: 'Sent revised quote with EMI options.', by: 'Ravi Sharma' },
      { id: 'a3', type: 'email', ts: '2026-02-23 10:00', note: 'Shared case studies of similar installations.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-28', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L005', name: 'Rohit Kapoor', company: 'Kapoor Pharma', phone: '9432109876', email: 'rohit@kapoor.com',
    source: 'LinkedIn', stage: 'qualified', score: 78, assignedTo: 'Ravi Sharma', kw: '200kW', value: 1120000,
    age: 5, city: 'Mumbai', state: 'Maharashtra', created: '2026-02-18', lastContact: '2026-02-23',
    monthlyBill: 180000, roofArea: 2000, roofType: 'Industrial Shed', budget: 1200000, category: 'Industrial',
    tags: ['LinkedIn', 'High Value'], lat: 19.0760, lng: 72.8777,
    activities: [
      { id: 'a1', type: 'email', ts: '2026-02-23 09:00', note: 'Follow-up on survey scheduling.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'call', ts: '2026-02-20 11:00', note: 'Detailed discussion on system design and ROI.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-27', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L006', name: 'Anjali Desai', company: 'Desai Farms', phone: '9321098765', email: 'anjali@desai.com',
    source: 'Website', stage: 'new', score: 41, assignedTo: 'Ravi Sharma', kw: '10kW', value: 56000,
    age: 10, city: 'Anand', state: 'Gujarat', created: '2026-02-13', lastContact: '2026-02-18',
    monthlyBill: 12000, roofArea: 100, roofType: 'Tin Sheet', budget: 60000, category: 'Agricultural',
    tags: ['Website', 'Small System'], lat: 22.5645, lng: 72.9289,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-18 10:00', note: 'Initial call done. Interested but budget concern.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-27', slaHours: 24, slaBreached: true,
  },
  {
    id: 'L007', name: 'Nilesh Parekh', company: 'Parekh Ceramics', phone: '9210987654', email: 'nilesh@parekh.com',
    source: 'Referral', stage: 'survey', score: 82, assignedTo: 'Ravi Sharma', kw: '150kW', value: 840000,
    age: 4, city: 'Morbi', state: 'Gujarat', created: '2026-02-19', lastContact: '2026-02-24',
    monthlyBill: 130000, roofArea: 1500, roofType: 'Industrial Shed', budget: 900000, category: 'Industrial',
    tags: ['Referral', 'Large System', 'Ceramics Belt'], lat: 22.8173, lng: 70.8372,
    activities: [
      { id: 'a1', type: 'whatsapp', ts: '2026-02-24 14:00', note: 'Survey confirmation sent via WhatsApp.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'call', ts: '2026-02-21 11:00', note: 'Discussed system sizing and ROI calculation.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-03-01', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L008', name: 'Kavita Nair', company: 'Nair Hospitality', phone: '9109876543', email: 'kavita@nair.com',
    source: 'Website', stage: 'new', score: 28, assignedTo: 'Ravi Sharma', kw: '20kW', value: 112000,
    age: 20, city: 'Pune', state: 'Maharashtra', created: '2026-02-03', lastContact: '2026-02-10',
    monthlyBill: 18000, roofArea: 200, roofType: 'RCC Flat', budget: 120000, category: 'Commercial',
    tags: ['Website', 'Stale'], lat: 18.5204, lng: 73.8567,
    activities: [
      { id: 'a1', type: 'email', ts: '2026-02-10 09:00', note: 'Follow-up email sent. No reply.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-27', slaHours: 48, slaBreached: true,
  },
  {
    id: 'L009', name: 'Harish Mehta', company: 'Mehta Dairy', phone: '9988112233', email: 'harish@mehta.com',
    source: 'Referral', stage: 'contacted', score: 88, assignedTo: 'Ravi Sharma', kw: '30kW', value: 168000,
    age: 1, city: 'Anand', state: 'Gujarat', created: '2026-02-25', lastContact: '2026-02-25',
    monthlyBill: 28000, roofArea: 300, roofType: 'RCC Flat', budget: 180000, category: 'Commercial',
    tags: ['Hot Lead', 'Quick Response'], lat: 22.5645, lng: 72.9289,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-25 09:00', note: 'Inbound call. Very interested. Wants survey ASAP.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-26', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L010', name: 'Pooja Sharma', company: 'Sharma Pharmaceuticals', phone: '9977334455', email: 'pooja@sharma.com',
    source: 'LinkedIn', stage: 'qualified', score: 65, assignedTo: 'Ravi Sharma', kw: '60kW', value: 336000,
    age: 6, city: 'Ahmedabad', state: 'Gujarat', created: '2026-02-17', lastContact: '2026-02-22',
    monthlyBill: 55000, roofArea: 600, roofType: 'RCC Flat', budget: 360000, category: 'Commercial',
    tags: ['LinkedIn', 'Pharma'], lat: 23.0225, lng: 72.5714,
    activities: [
      { id: 'a1', type: 'email', ts: '2026-02-22 10:00', note: 'Sent technical specification sheet.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'call', ts: '2026-02-19 15:00', note: 'Qualification call done. Budget confirmed.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-28', slaHours: 4, slaBreached: false,
  },
  {
    id: 'L011', name: 'Vijay Chaudhary', company: 'Chaudhary Agro', phone: '9966445566', email: 'vijay@chaudhary.com',
    source: 'Website', stage: 'proposal', score: 58, assignedTo: 'Ravi Sharma', kw: '40kW', value: 224000,
    age: 8, city: 'Gandhinagar', state: 'Gujarat', created: '2026-02-15', lastContact: '2026-02-23',
    monthlyBill: 35000, roofArea: 400, roofType: 'RCC Flat', budget: 240000, category: 'Agricultural',
    tags: ['Website', 'Agro'], lat: 23.2156, lng: 72.6369,
    activities: [
      { id: 'a1', type: 'email', ts: '2026-02-23 11:00', note: 'Proposal sent.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-28', slaHours: 4, slaBreached: false,
  },
  {
    id: 'L012', name: 'Rekha Iyer', company: 'Iyer Exports', phone: '9955556677', email: 'rekha@iyer.com',
    source: 'Campaign', stage: 'lost', score: 15, assignedTo: 'Ravi Sharma', kw: '80kW', value: 448000,
    age: 25, city: 'Chennai', state: 'Tamil Nadu', created: '2026-01-29', lastContact: '2026-02-10',
    monthlyBill: 70000, roofArea: 800, roofType: 'Industrial Shed', budget: 300000, category: 'Industrial',
    tags: ['Campaign', 'Lost', 'Budget Mismatch'], lat: 13.0827, lng: 80.2707,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-10 14:00', note: 'Customer chose competitor due to lower price.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'email', ts: '2026-02-05 09:00', note: 'Final attempt with revised pricing.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: null, slaHours: 0, slaBreached: false,
  },
  {
    id: 'L013', name: 'Sanjay Patel', company: 'Patel Engineering', phone: '9944667788', email: 'sanjay@patel.com',
    source: 'Walk-in', stage: 'negotiation', score: 93, assignedTo: 'Ravi Sharma', kw: '120kW', value: 672000,
    age: 3, city: 'Rajkot', state: 'Gujarat', created: '2026-02-20', lastContact: '2026-02-25',
    monthlyBill: 105000, roofArea: 1200, roofType: 'Industrial Shed', budget: 700000, category: 'Industrial',
    tags: ['Walk-in', 'Hot', 'Engineering'], lat: 22.3039, lng: 70.8022,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-25 15:00', note: 'Final pricing discussion. Expects sign-off by March 1.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-03-01', slaHours: 2, slaBreached: false,
  },
  {
    id: 'L014', name: 'Manisha Gupta', company: 'Gupta Textile Park', phone: '9933778899', email: 'manisha@gupta.com',
    source: 'Referral', stage: 'qualified', score: 61, assignedTo: 'Ravi Sharma', kw: '90kW', value: 504000,
    age: 12, city: 'Surat', state: 'Gujarat', created: '2026-02-11', lastContact: '2026-02-21',
    monthlyBill: 78000, roofArea: 900, roofType: 'Industrial Shed', budget: 540000, category: 'Industrial',
    tags: ['Referral', 'Textile'], lat: 21.1702, lng: 72.8311,
    activities: [
      { id: 'a1', type: 'whatsapp', ts: '2026-02-21 10:00', note: 'Sent summary WhatsApp message with specs.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: '2026-02-28', slaHours: 4, slaBreached: false,
  },
  {
    id: 'L015', name: 'Arpit Jain', company: 'Jain Auto Components', phone: '9922889900', email: 'arpit@jain.com',
    source: 'LinkedIn', stage: 'won', score: 100, assignedTo: 'Ravi Sharma', kw: '180kW', value: 1008000,
    age: 9, city: 'Vadodara', state: 'Gujarat', created: '2026-02-14', lastContact: '2026-02-25',
    monthlyBill: 155000, roofArea: 1800, roofType: 'Industrial Shed', budget: 1100000, category: 'Industrial',
    tags: ['LinkedIn', 'Won', 'Large System'], lat: 22.3072, lng: 73.1812,
    activities: [
      { id: 'a1', type: 'call', ts: '2026-02-25 10:00', note: 'PO received. Project kick-off scheduled March 1.', by: 'Ravi Sharma' },
      { id: 'a2', type: 'email', ts: '2026-02-23 09:00', note: 'Contract signed and sent back.', by: 'Ravi Sharma' },
    ],
    nextFollowUp: null, slaHours: 0, slaBreached: false,
  },
];

export const CUSTOMERS = [
  { id: 'C001', name: 'Prakash Agarwal', company: 'Agarwal Steel', phone: '9876001234', email: 'prakash@agarwal.com', city: 'Ahmedabad', totalProjects: 2, totalValue: 640000, since: '2025-06-15' },
  { id: 'C002', name: 'Meena Patel', company: 'Patel Ceramics', phone: '9876002345', email: 'meena@patel.com', city: 'Morbi', totalProjects: 1, totalValue: 280000, since: '2025-09-22' },
  { id: 'C003', name: 'Suresh Bhatt', company: 'Bhatt Chemicals', phone: '9876003456', email: 'suresh@bhatt.com', city: 'Vapi', totalProjects: 3, totalValue: 1680000, since: '2025-03-10' },
  { id: 'C004', name: 'Dinesh Trivedi', company: 'Trivedi Foods', phone: '9876004567', email: 'dinesh@trivedi.com', city: 'Nadiad', totalProjects: 1, totalValue: 308000, since: '2025-11-05' },
];

export const SURVEYS = [
  { id: 'S001', leadId: 'L001', customerName: 'Ramesh Joshi', site: 'Plot 45, GIDC Ahmedabad', scheduledDate: '2026-02-25', completedDate: '2026-02-25', status: 'Completed', roofArea: 500, shadowPct: 5, tiltAngle: 20, estimatedKw: 50, engineer: 'Priya Patel' },
  { id: 'S002', leadId: 'L002', customerName: 'Sunita Malhotra', site: 'Ring Road, Surat', scheduledDate: '2026-02-26', completedDate: null, status: 'Scheduled', roofArea: 1000, shadowPct: 10, tiltAngle: 22, estimatedKw: 100, engineer: 'Priya Patel' },
  { id: 'S003', leadId: 'L005', customerName: 'Rohit Kapoor', site: 'MIDC Navi Mumbai', scheduledDate: '2026-02-27', completedDate: null, status: 'Pending', roofArea: 2000, shadowPct: 8, tiltAngle: 18, estimatedKw: 200, engineer: 'Priya Patel' },
  { id: 'S004', leadId: 'L007', customerName: 'Nilesh Parekh', site: 'Morbi Ceramic Belt', scheduledDate: '2026-03-01', completedDate: null, status: 'Scheduled', roofArea: 1500, shadowPct: 6, tiltAngle: 21, estimatedKw: 150, engineer: 'Priya Patel' },
];

export const DESIGNS = [
  { id: 'D001', surveyId: 'S001', projectName: 'Joshi Industries 50kW', systemSize: 50, panels: '125 x 400W Mono PERC', inverter: '50kW String Inverter', cable: '4mm² DC + 16mm² AC', boqGenerated: true, status: 'Approved', designer: 'Arjun Mehta', created: '2026-02-22' },
  { id: 'D002', surveyId: 'S002', projectName: 'Malhotra Textiles 100kW', systemSize: 100, panels: '250 x 400W Mono PERC', inverter: '2 x 50kW String Inverter', cable: '4mm² DC + 25mm² AC', boqGenerated: true, status: 'Draft', designer: 'Arjun Mehta', created: '2026-02-24' },
  { id: 'D003', surveyId: 'S004', projectName: 'Parekh Ceramics 150kW', systemSize: 150, panels: '375 x 400W Mono PERC', inverter: '3 x 50kW String Inverter', cable: '4mm² DC + 35mm² AC', boqGenerated: false, status: 'In Review', designer: 'Arjun Mehta', created: '2026-02-25' },
];

export const QUOTATIONS = [
  { id: 'Q001', designId: 'D001', leadId: 'L001', customerName: 'Ramesh Joshi', systemSize: 50, totalPrice: 280000, costPrice: 210000, margin: 25, status: 'Approved', discount: 5, sentDate: '2026-02-23', approvedDate: '2026-02-24', validTill: '2026-03-23' },
  { id: 'Q002', designId: 'D002', leadId: 'L002', customerName: 'Sunita Malhotra', systemSize: 100, totalPrice: 560000, costPrice: 420000, margin: 25, status: 'Sent', discount: 0, sentDate: '2026-02-25', approvedDate: null, validTill: '2026-03-25' },
  { id: 'Q003', designId: null, leadId: 'L004', customerName: 'Deepika Shah', systemSize: 75, totalPrice: 420000, costPrice: 315000, margin: 25, status: 'Draft', discount: 3, sentDate: null, approvedDate: null, validTill: '2026-03-22' },
  { id: 'Q004', designId: 'D003', leadId: 'L007', customerName: 'Nilesh Parekh', systemSize: 150, totalPrice: 840000, costPrice: 630000, margin: 25, status: 'Draft', discount: 0, sentDate: null, approvedDate: null, validTill: '2026-03-26' },
];

export const PROJECTS = [
  { id: 'P001', quotationId: 'Q001', customerName: 'Ramesh Joshi', site: 'GIDC Ahmedabad', systemSize: 50, status: 'Installation', pm: 'Neha Gupta', startDate: '2026-02-25', estEndDate: '2026-03-15', progress: 60, value: 280000, milestones: [{ name: 'Material Ready', status: 'Done', date: '2026-02-27' }, { name: 'Installation', status: 'In Progress', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
  { id: 'P002', quotationId: null, customerName: 'Suresh Bhatt', site: 'Vapi GIDC', systemSize: 150, status: 'Design', pm: 'Neha Gupta', startDate: '2026-02-20', estEndDate: '2026-03-30', progress: 20, value: 840000, milestones: [{ name: 'Material Ready', status: 'Pending', date: null }, { name: 'Installation', status: 'Pending', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
  { id: 'P003', quotationId: null, customerName: 'Prakash Agarwal', site: 'Ahmedabad Plant', systemSize: 80, status: 'Commissioned', pm: 'Neha Gupta', startDate: '2025-12-01', estEndDate: '2026-01-15', progress: 100, value: 448000, milestones: [{ name: 'Material Ready', status: 'Done', date: '2025-12-10' }, { name: 'Installation', status: 'Done', date: '2025-12-28' }, { name: 'Commission', status: 'Done', date: '2026-01-10' }, { name: 'Billing', status: 'Done', date: '2026-01-12' }, { name: 'Closure', status: 'Done', date: '2026-01-15' }] },
  { id: 'P004', quotationId: null, customerName: 'Dinesh Trivedi', site: 'Nadiad Plant', systemSize: 55, status: 'Procurement', pm: 'Neha Gupta', startDate: '2026-02-10', estEndDate: '2026-03-20', progress: 35, value: 308000, milestones: [{ name: 'Material Ready', status: 'In Progress', date: null }, { name: 'Installation', status: 'Pending', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
  { id: 'P005', quotationId: null, customerName: 'Meena Patel', site: 'Morbi Factory', systemSize: 40, status: 'Survey', pm: 'Neha Gupta', startDate: '2026-02-22', estEndDate: '2026-04-05', progress: 10, value: 224000, milestones: [{ name: 'Material Ready', status: 'Pending', date: null }, { name: 'Installation', status: 'Pending', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
  { id: 'P006', quotationId: null, customerName: 'Nilesh Parekh', site: 'Morbi Ceramic Belt', systemSize: 150, status: 'Design', pm: 'Neha Gupta', startDate: '2026-02-15', estEndDate: '2026-04-10', progress: 18, value: 840000, milestones: [{ name: 'Material Ready', status: 'Pending', date: null }, { name: 'Installation', status: 'Pending', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
  { id: 'P007', quotationId: null, customerName: 'Harish Mehta', site: 'Anand Dairy', systemSize: 30, status: 'Quotation', pm: 'Neha Gupta', startDate: '2026-02-26', estEndDate: '2026-04-01', progress: 8, value: 168000, milestones: [{ name: 'Material Ready', status: 'Pending', date: null }, { name: 'Installation', status: 'Pending', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
  { id: 'P008', quotationId: null, customerName: 'Deepika Shah', site: 'Shah Motors Vadodara', systemSize: 75, status: 'On Hold', pm: 'Neha Gupta', startDate: '2026-01-20', estEndDate: null, progress: 45, value: 420000, milestones: [{ name: 'Material Ready', status: 'Done', date: '2026-01-28' }, { name: 'Installation', status: 'Pending', date: null }, { name: 'Commission', status: 'Pending', date: null }, { name: 'Billing', status: 'Pending', date: null }, { name: 'Closure', status: 'Pending', date: null }] },
];

export const INVENTORY = [
  { id: 'I001', name: '400W Mono PERC Panel', category: 'Panel', unit: 'Nos', stock: 450, reserved: 125, available: 325, minStock: 100, warehouse: 'WH-Ahmedabad', rate: 14500, lastUpdated: '2026-02-24' },
  { id: 'I002', name: '50kW String Inverter', category: 'Inverter', unit: 'Nos', stock: 8, reserved: 2, available: 6, minStock: 3, warehouse: 'WH-Ahmedabad', rate: 185000, lastUpdated: '2026-02-22' },
  { id: 'I003', name: '10kW On-Grid Inverter', category: 'Inverter', unit: 'Nos', stock: 2, reserved: 0, available: 2, minStock: 5, warehouse: 'WH-Ahmedabad', rate: 62000, lastUpdated: '2026-02-20' },
  { id: 'I004', name: '4mm² DC Cable', category: 'BOS', unit: 'Mtr', stock: 5000, reserved: 800, available: 4200, minStock: 1000, warehouse: 'WH-Surat', rate: 42, lastUpdated: '2026-02-23' },
  { id: 'I005', name: 'MC4 Connector Set', category: 'BOS', unit: 'Pairs', stock: 2000, reserved: 500, available: 1500, minStock: 500, warehouse: 'WH-Ahmedabad', rate: 85, lastUpdated: '2026-02-21' },
  { id: 'I006', name: 'Mounting Structure (GI)', category: 'Structure', unit: 'Set', stock: 15, reserved: 5, available: 10, minStock: 5, warehouse: 'WH-Surat', rate: 18000, lastUpdated: '2026-02-18' },
];

export const VENDORS = [
  { id: 'V001', name: 'Tata Solar Products', category: 'Panel', contact: 'Raj Kumar', phone: '9988776655', email: 'raj@tatasolar.com', rating: 5, city: 'Mumbai', totalOrders: 12 },
  { id: 'V002', name: 'SMA Energy India', category: 'Inverter', contact: 'Anand Mehta', phone: '9877665544', email: 'anand@sma.in', rating: 4, city: 'Delhi', totalOrders: 8 },
  { id: 'V003', name: 'Polycab Wires', category: 'BOS', contact: 'Pradeep Jain', phone: '9766554433', email: 'pradeep@polycab.com', rating: 5, city: 'Ahmedabad', totalOrders: 20 },
  { id: 'V004', name: 'Nextracker Structures', category: 'Structure', contact: 'Sanjay Verma', phone: '9655443322', email: 'sanjay@nextracker.com', rating: 4, city: 'Pune', totalOrders: 6 },
];

export const INVOICES = [
  { id: 'INV001', projectId: 'P003', customerName: 'Prakash Agarwal', amount: 448000, paid: 448000, balance: 0, status: 'Paid', invoiceDate: '2026-01-12', dueDate: '2026-02-12', paidDate: '2026-02-05' },
  { id: 'INV002', projectId: 'P001', customerName: 'Ramesh Joshi', amount: 280000, paid: 140000, balance: 140000, status: 'Partial', invoiceDate: '2026-02-24', dueDate: '2026-03-24', paidDate: null },
  { id: 'INV003', projectId: 'P002', customerName: 'Suresh Bhatt', amount: 840000, paid: 0, balance: 840000, status: 'Pending', invoiceDate: '2026-02-20', dueDate: '2026-03-20', paidDate: null },
  { id: 'INV004', projectId: 'P004', customerName: 'Dinesh Trivedi', amount: 308000, paid: 154000, balance: 154000, status: 'Partial', invoiceDate: '2026-02-22', dueDate: '2026-03-22', paidDate: null },
  { id: 'INV005', projectId: 'P006', customerName: 'Nilesh Parekh', amount: 336000, paid: 0, balance: 336000, status: 'Pending', invoiceDate: '2026-02-25', dueDate: '2026-03-25', paidDate: null },
  { id: 'INV006', projectId: 'P005', customerName: 'Meena Patel', amount: 224000, paid: 224000, balance: 0, status: 'Paid', invoiceDate: '2026-01-20', dueDate: '2026-02-20', paidDate: '2026-02-15' },
  { id: 'INV007', projectId: 'P008', customerName: 'Deepika Shah', amount: 420000, paid: 0, balance: 420000, status: 'Overdue', invoiceDate: '2026-01-25', dueDate: '2026-02-25', paidDate: null },
];

export const TICKETS = [
  { id: 'T001', customerId: 'C001', customerName: 'Prakash Agarwal', type: 'Maintenance', description: 'Inverter showing fault code E003', priority: 'High', status: 'Open', assignedTo: 'Kiran Tech', created: '2026-02-24', resolved: null },
  { id: 'T002', customerId: 'C002', customerName: 'Meena Patel', type: 'AMC', description: 'Annual maintenance visit scheduled', priority: 'Low', status: 'Scheduled', assignedTo: 'Kiran Tech', created: '2026-02-22', resolved: null },
  { id: 'T003', customerId: 'C003', customerName: 'Suresh Bhatt', type: 'Warranty', description: 'Panel micro-crack identified in batch B-2024', priority: 'Medium', status: 'Resolved', assignedTo: 'Kiran Tech', created: '2026-02-15', resolved: '2026-02-18' },
  { id: 'T004', customerId: 'C004', customerName: 'Dinesh Trivedi', type: 'Maintenance', description: 'Generation output 15% below expected baseline', priority: 'Medium', status: 'In Progress', assignedTo: 'Kiran Tech', created: '2026-02-25', resolved: null },
];

export const KPI_STATS = {
  revenue: { current: 15680000, growth: 23, target: 20000000 },
  margin: { avg: 24.5, target: 25 },
  pipeline: { value: 12460000, leads: 15 },
  activeProjects: 7,
  delayedProjects: 2,
  cashPosition: 4230000,
  receivables: 1950000,
  payables: 925000,
};

export const MONTHLY_REVENUE = [
  { month: 'Sep', revenue: 850000, cost: 640000 },
  { month: 'Oct', revenue: 1200000, cost: 900000 },
  { month: 'Nov', revenue: 980000, cost: 740000 },
  { month: 'Dec', revenue: 1450000, cost: 1090000 },
  { month: 'Jan', revenue: 1680000, cost: 1260000 },
  { month: 'Feb', revenue: 2100000, cost: 1575000 },
];

export const LEAD_FUNNEL = [
  { stage: 'Total Leads', count: 45 },
  { stage: 'Qualified', count: 28 },
  { stage: 'Survey Done', count: 18 },
  { stage: 'Quoted', count: 12 },
  { stage: 'Approved', count: 8 },
  { stage: 'Converted', count: 6 },
];

export const CASH_FLOW = [
  { month: 'Oct', inflow: 1200000, outflow: 900000 },
  { month: 'Nov', inflow: 980000, outflow: 1100000 },
  { month: 'Dec', inflow: 1450000, outflow: 1090000 },
  { month: 'Jan', inflow: 1800000, outflow: 1200000 },
  { month: 'Feb', inflow: 2100000, outflow: 1400000 },
  { month: 'Mar', inflow: 2400000, outflow: 1600000 },
];

export const PROJECT_STAGE_TREND = [
  { month: 'Oct', survey: 8, design: 5, installation: 4 },
  { month: 'Nov', survey: 10, design: 7, installation: 5 },
  { month: 'Dec', survey: 9, design: 8, installation: 7 },
  { month: 'Jan', survey: 12, design: 10, installation: 8 },
  { month: 'Feb', survey: 14, design: 11, installation: 9 },
];

// ── Sparkline series (7-day) for KPI cards ──
export const SPARKLINES = {
  revenue: [620, 710, 680, 820, 760, 910, 1050],
  margin: [23.1, 23.8, 24.2, 23.9, 24.5, 25.1, 24.5],
  pipeline: [6800, 7100, 7400, 7200, 7800, 8100, 8420],
  cash: [3800, 4100, 3950, 4200, 4050, 4300, 4230],
  receivables: [980, 1100, 1050, 1200, 1180, 1300, 1260],
  payables: [700, 750, 800, 850, 900, 920, 925],
};

// ── AI Insights ──
export const AI_INSIGHTS = [
  {
    id: 'AI001',
    severity: 'critical',
    icon: 'TrendingDown',
    title: 'Revenue gap detected',
    body: 'Pipeline conversion at 13% — below 20% target. ₹42L at risk for Q1 close. 3 quotes pending approval > 7 days.',
    action: { label: 'Review Quotes', page: 'quotation' },
  },
  {
    id: 'AI002',
    severity: 'warning',
    icon: 'AlertTriangle',
    title: '3 projects at delay risk',
    body: 'P001 (Ramesh Joshi) 4 days behind. P004 (Dinesh Trivedi) material delay. Cash flow deficit projected in 12 days.',
    action: { label: 'Open Projects', page: 'project' },
  },
  {
    id: 'AI003',
    severity: 'info',
    icon: 'Package',
    title: 'Low stock: 2 critical SKUs',
    body: '10kW Inverter stock (2 units) below minimum (5). Suggest PO to SMA Energy. DC Cable reorder point hit.',
    action: { label: 'Raise PO', page: 'procurement' },
  },
  {
    id: 'AI004',
    severity: 'success',
    icon: 'Star',
    title: 'High-value lead: Rohit Kapoor',
    body: '₹11.2L, 200kW — qualified, 5-day engagement. 74% conversion probability. Book survey now to unlock.',
    action: { label: 'Book Survey', page: 'survey' },
  },
];

// ── Alerts ──
export const ALERTS = [
  { id: 'A001', type: 'stock', severity: 'critical', message: '10kW Inverter — 2 units left (min 5)', time: '10 mins ago', page: 'inventory' },
  { id: 'A002', type: 'delay', severity: 'critical', message: 'P001 Ramesh Joshi — 4 days behind schedule', time: '1 hour ago', page: 'project' },
  { id: 'A003', type: 'invoice', severity: 'warning', message: 'INV003 Suresh Bhatt — ₹8.4L overdue 5 days', time: '2 hours ago', page: 'finance' },
  { id: 'A004', type: 'stock', severity: 'warning', message: 'DC Cable reorder point reached (5000m used)', time: '3 hours ago', page: 'inventory' },
  { id: 'A005', type: 'delay', severity: 'warning', message: 'P004 Dinesh Trivedi — material delivery delayed', time: '5 hours ago', page: 'project' },
  { id: 'A006', type: 'invoice', severity: 'info', message: 'INV002 Ramesh Joshi — partial ₹1.4L outstanding', time: '8 hours ago', page: 'finance' },
];

// ── Activity Feed ──
export const ACTIVITY_FEED = [
  { id: 'ACT001', actor: 'Neha Gupta', avatar: 'NG', action: 'updated project status', subject: 'P001 to Installation', time: '5 mins ago', type: 'project' },
  { id: 'ACT002', actor: 'Ravi Sharma', avatar: 'RS', action: 'sent quotation', subject: 'Q002 to Sunita Malhotra', time: '22 mins ago', type: 'quotation' },
  { id: 'ACT003', actor: 'Priya Patel', avatar: 'PP', action: 'completed survey', subject: 'S001 Ramesh Joshi — GIDC', time: '1 hr ago', type: 'survey' },
  { id: 'ACT004', actor: 'Arjun Mehta', avatar: 'AM', action: 'approved design', subject: 'D001 Joshi Industries 50kW', time: '2 hrs ago', type: 'design' },
  { id: 'ACT005', actor: 'Vikram Singh', avatar: 'VS', action: 'received PO delivery', subject: 'PO001 — 200 Tata Solar Panels', time: '3 hrs ago', type: 'inventory' },
  { id: 'ACT006', actor: 'Sunita Rao', avatar: 'SR', action: 'raised invoice', subject: 'INV002 ₹2.8L — Ramesh Joshi', time: '4 hrs ago', type: 'finance' },
  { id: 'ACT007', actor: 'Kiran Tech', avatar: 'KT', action: 'opened service ticket', subject: 'T001 Inverter fault E003', time: '5 hrs ago', type: 'service' },
  { id: 'ACT008', actor: 'Ravi Sharma', avatar: 'RS', action: 'qualified lead', subject: 'L007 Nilesh Parekh ₹8.4L', time: '6 hrs ago', type: 'crm' },
];

// ── Revenue vs Cost (monthly with margin %) ──
export const REVENUE_COST = [
  { month: 'Aug', revenue: 680000, cost: 520000, margin: 23.5 },
  { month: 'Sep', revenue: 850000, cost: 640000, margin: 24.7 },
  { month: 'Oct', revenue: 1200000, cost: 900000, margin: 25.0 },
  { month: 'Nov', revenue: 980000, cost: 740000, margin: 24.5 },
  { month: 'Dec', revenue: 1450000, cost: 1090000, margin: 24.8 },
  { month: 'Jan', revenue: 1680000, cost: 1260000, margin: 25.0 },
  { month: 'Feb', revenue: 2100000, cost: 1575000, margin: 25.0 },
];

// Legacy alias kept for backward compatibility
export const ROLES_ACCESS = {
  Admin: ['crm', 'survey', 'design', 'quotation', 'project', 'inventory', 'procurement', 'logistics', 'installation', 'commissioning', 'finance', 'service', 'compliance', 'dashboard'],
  Sales: ['crm', 'quotation', 'dashboard'],
  'Survey Engineer': ['survey', 'crm', 'dashboard'],
  'Design Engineer': ['design', 'survey', 'quotation', 'dashboard'],
  'Project Manager': ['project', 'installation', 'commissioning', 'logistics', 'dashboard'],
  'Store Manager': ['inventory', 'procurement', 'logistics', 'dashboard'],
  Finance: ['finance', 'compliance', 'dashboard'],
  Technician: ['installation', 'commissioning', 'service', 'dashboard'],
};
