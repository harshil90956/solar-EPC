// Solar OS – Professional Solar Quotation Page
// Modern, clean UI for generating solar quotations

import React, { useState, useMemo } from 'react';
import {
  Sun,
  Plus,
  Trash2,
  Download,
  FileText,
  Mail,
  Phone,
  MapPin,
  User,
  Building2,
  Calendar,
  Hash,
  Zap,
  PanelTop,
  HardDrive,
  CheckCircle,
  Save,
  Send,
  Printer,
  ChevronRight,
  Shield,
  Clock,
  Award,
  TrendingUp,
  Battery,
  Wrench,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea, FormField } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { CURRENCY } from '../config/app.config';
import { cn } from '../lib/utils';
import { downloadQuotationPDF } from '../lib/pdfTemplate';

const fmt = CURRENCY.format;

// ── Default Solar Items ─────────────────────────────────────────────────────
const DEFAULT_SOLAR_ITEMS = [
  { name: 'Solar PV Module 550W', description: 'High-efficiency monocrystalline solar panel', quantity: 20, unitPrice: 15000 },
  { name: 'Grid Tie Inverter', description: '10kW three-phase solar inverter with monitoring', quantity: 1, unitPrice: 80000 },
  { name: 'Mounting Structure', description: 'Galvanized iron mounting structure with clamps', quantity: 1, unitPrice: 25000 },
  { name: 'DC Cables', description: '4 sq.mm solar DC cable (UV resistant)', quantity: 100, unitPrice: 85 },
  { name: 'AC Cables', description: '3.5C x 35 sq.mm copper AC cable', quantity: 50, unitPrice: 220 },
  { name: 'Earthing Kit', description: 'Complete earthing system with electrodes', quantity: 1, unitPrice: 12000 },
  { name: 'Lightning Arrestor', description: 'ESE lightning protection system', quantity: 1, unitPrice: 8500 },
  { name: 'Installation', description: 'Complete installation and commissioning', quantity: 1, unitPrice: 35000 },
];

// ── Solar Panel Types ───────────────────────────────────────────────────────
const PANEL_TYPES = [
  { value: 'mono', label: 'Monocrystalline' },
  { value: 'poly', label: 'Polycrystalline' },
  { value: 'bifacial', label: 'Bifacial' },
  { value: 'topcon', label: 'TopCon N-Type' },
];

const INVERTER_TYPES = [
  { value: 'string', label: 'String Inverter' },
  { value: 'hybrid', label: 'Hybrid Inverter' },
  { value: 'micro', label: 'Micro Inverter' },
  { value: 'central', label: 'Central Inverter' },
];

const INSTALLATION_TYPES = [
  { value: 'ongrid', label: 'On-Grid' },
  { value: 'offgrid', label: 'Off-Grid' },
  { value: 'hybrid', label: 'Hybrid' },
];

// ── Solar Quotation Page ─────────────────────────────────────────────────────
const SolarQuotationPage = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [showSuccess, setShowSuccess] = useState(false);

  // Header State
  const [quotationNo, setQuotationNo] = useState(`QTN-${Date.now().toString().slice(-6)}`);
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Project State
  const [projectName, setProjectName] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [systemCapacity, setSystemCapacity] = useState('');
  const [panelType, setPanelType] = useState('mono');
  const [inverterType, setInverterType] = useState('string');
  const [installationType, setInstallationType] = useState('ongrid');

  // Items State
  const [items, setItems] = useState(DEFAULT_SOLAR_ITEMS);

  // Terms State
  const [terms, setTerms] = useState(`1. Payment Terms: 40% advance, 40% on material delivery, 20% on commissioning.
2. Warranty: 25 years on solar panels, 10 years on inverter, 5 years on installation.
3. Project Timeline: 15-30 days from order confirmation.
4. Price valid for 30 days from quotation date.
5. Installation includes complete mounting, wiring, and commissioning.
6. Net metering documentation assistance provided.`);

  // ── Calculations ─────────────────────────────────────────────────────────────
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = 0;
    const discountAmount = (subtotal * discount) / 100;
    const gstRate = 8.9;
    const gstAmount = ((subtotal - discountAmount) * gstRate) / 100;
    const total = subtotal - discountAmount + gstAmount;

    return { subtotal, discount, discountAmount, gstRate, gstAmount, total };
  }, [items]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const addItem = () => {
    setItems([...items, { name: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleGeneratePDF = () => {
    const quotationData = {
      quotationNumber: quotationNo,
      quotationDate,
      validUntil,
      customerName,
      customerAddress,
      customerPhone,
      projectName,
      projectLocation,
      systemCapacity,
      items,
      terms,
      ...calculations,
    };
    downloadQuotationPDF(quotationData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleReset = () => {
    setCustomerName('');
    setCompanyName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setCustomerEmail('');
    setProjectName('');
    setProjectLocation('');
    setSystemCapacity('');
    setItems(DEFAULT_SOLAR_ITEMS);
    setQuotationNo(`QTN-${Date.now().toString().slice(-6)}`);
  };

  // ── Preview Section ─────────────────────────────────────────────────────────
  const PreviewSection = () => (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
      {/* Preview Header */}
      <div className="flex items-start justify-between border-b-2 border-orange-500 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl flex items-center justify-center shadow-lg">
            <Sun size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SUNVORA SOLAR</h1>
            <p className="text-sm text-gray-600 mt-1">Green Energy Solutions Pvt. Ltd.</p>
            <p className="text-xs text-gray-500 mt-1">104-1117, Millennium Business Hub, Surat-395006</p>
            <p className="text-xs text-gray-500">📞 1800-123-1232 | 📧 epc@sunvora.com</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Quotation No</p>
            <p className="text-lg font-bold text-orange-600">{quotationNo}</p>
          </div>
          <p className="text-sm text-gray-600 mt-2">📅 {quotationDate}</p>
          <p className="text-xs text-gray-500">Valid till: {validUntil}</p>
        </div>
      </div>

      {/* Customer Info Preview */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <User size={16} className="text-orange-500" />
            Customer Details
          </h3>
          <p className="text-sm font-medium text-gray-900">{customerName || 'Customer Name'}</p>
          <p className="text-xs text-gray-600">{companyName}</p>
          <p className="text-xs text-gray-500 mt-1">📍 {customerAddress || 'Address'}</p>
          <p className="text-xs text-gray-500">📞 {customerPhone || 'Phone'}</p>
          <p className="text-xs text-gray-500">✉️ {customerEmail || 'Email'}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Zap size={16} className="text-orange-500" />
            Project Details
          </h3>
          <p className="text-sm font-medium text-gray-900">{projectName || 'Project Name'}</p>
          <p className="text-xs text-gray-600">📍 {projectLocation || 'Location'}</p>
          <p className="text-xs text-gray-500 mt-1">⚡ System: {systemCapacity || '0'} kW</p>
          <p className="text-xs text-gray-500">🔋 Panel: {PANEL_TYPES.find(p => p.value === panelType)?.label}</p>
          <p className="text-xs text-gray-500">🔌 Inverter: {INVERTER_TYPES.find(i => i.value === inverterType)?.label}</p>
        </div>
      </div>

      {/* Items Table Preview */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
              <th className="px-3 py-3 text-left rounded-tl-lg">Sr</th>
              <th className="px-3 py-3 text-left">Item Name</th>
              <th className="px-3 py-3 text-left">Description</th>
              <th className="px-3 py-3 text-center">Qty</th>
              <th className="px-3 py-3 text-right">Unit Price</th>
              <th className="px-3 py-3 text-right rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-3 py-3 text-gray-600">{index + 1}</td>
                <td className="px-3 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-3 py-3 text-gray-600">{item.description}</td>
                <td className="px-3 py-3 text-center text-gray-900">{item.quantity}</td>
                <td className="px-3 py-3 text-right text-gray-900">₹{item.unitPrice.toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-medium text-gray-900">
                  ₹{(item.quantity * item.unitPrice).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Preview */}
      <div className="flex justify-end mb-6">
        <div className="bg-gray-50 rounded-xl p-4 w-72">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{calculations.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST ({calculations.gstRate}%)</span>
              <span>₹{calculations.gstAmount.toLocaleString()}</span>
            </div>
            <div className="border-t-2 border-orange-500 pt-2 flex justify-between font-bold text-lg">
              <span className="text-gray-900">Grand Total</span>
              <span className="text-orange-600">₹{calculations.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Preview */}
      <div className="bg-amber-50 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Terms & Conditions</h3>
        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{terms}</pre>
      </div>

      {/* Footer Preview */}
      <div className="flex justify-between items-end border-t border-gray-200 pt-6">
        <div>
          <p className="text-xs text-gray-500 mb-4">Authorized Signature</p>
          <div className="w-48 h-16 border-b-2 border-gray-400" />
          <p className="text-xs text-gray-600 mt-2">For Sunvora Solar Pvt. Ltd.</p>
        </div>
        <div className="text-center">
          <div className="w-24 h-24 border-2 border-dashed border-orange-300 rounded-full flex items-center justify-center">
            <span className="text-xs text-orange-400">Company Stamp</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-4">Customer Acceptance</p>
          <div className="w-48 h-16 border-b-2 border-gray-400" />
          <p className="text-xs text-gray-600 mt-2">Signature & Date</p>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Thank you for choosing our solar solutions. Let's build a greener future together! 🌱
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle size={20} />
          <span>Quotation PDF downloaded successfully!</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl flex items-center justify-center shadow-lg">
                <Sun size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Solar Quotation</h1>
                <p className="text-sm text-gray-500">Generate professional solar quotations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab(activeTab === 'create' ? 'preview' : 'create')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                {activeTab === 'create' ? (
                  <><FileText size={18} /> Preview</>
                ) : (
                  <><ChevronRight size={18} /> Back to Edit</>
                )}
              </button>
              <Button onClick={handleGeneratePDF} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600">
                <Download size={18} />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {activeTab === 'create' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <Hash size={20} />
                  <h2 className="text-lg font-bold">Quotation Details</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Quotation Number">
                    <Input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} />
                  </FormField>
                  <FormField label="Date">
                    <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} />
                  </FormField>
                  <FormField label="Valid Until">
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </FormField>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <User size={20} />
                  <h2 className="text-lg font-bold">Customer Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Customer Name *" required>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                    />
                  </FormField>
                  <FormField label="Company Name">
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name (optional)"
                    />
                  </FormField>
                  <FormField label="Address *" className="md:col-span-2" required>
                    <Textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Enter complete address"
                      rows={2}
                    />
                  </FormField>
                  <FormField label="Phone Number *" required>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </FormField>
                  <FormField label="Email Address">
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                    />
                  </FormField>
                </div>
              </div>

              {/* Project Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <Zap size={20} />
                  <h2 className="text-lg font-bold">Project Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Project Name *" required>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., 10kW Solar Rooftop Installation"
                    />
                  </FormField>
                  <FormField label="Project Location *" required>
                    <Input
                      value={projectLocation}
                      onChange={(e) => setProjectLocation(e.target.value)}
                      placeholder="e.g., Surat, Gujarat"
                    />
                  </FormField>
                  <FormField label="System Capacity (kW) *" required>
                    <Input
                      type="number"
                      value={systemCapacity}
                      onChange={(e) => setSystemCapacity(e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </FormField>
                  <FormField label="Solar Panel Type">
                    <Select
                      value={panelType}
                      onChange={(v) => setPanelType(v)}
                      options={PANEL_TYPES}
                    />
                  </FormField>
                  <FormField label="Inverter Type">
                    <Select
                      value={inverterType}
                      onChange={(v) => setInverterType(v)}
                      options={INVERTER_TYPES}
                    />
                  </FormField>
                  <FormField label="Installation Type">
                    <Select
                      value={installationType}
                      onChange={(v) => setInstallationType(v)}
                      options={INSTALLATION_TYPES}
                    />
                  </FormField>
                </div>
              </div>

              {/* Items Table Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-orange-600">
                    <FileSpreadsheet size={20} />
                    <h2 className="text-lg font-bold">Product / Material Table</h2>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={addItem} className="flex items-center gap-1">
                    <Plus size={16} />
                    Add Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 rounded-tl-lg">Sr</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Item Name</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">Qty</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 rounded-tr-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-3 py-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              className="text-sm"
                              placeholder="Item name"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="text-sm"
                              placeholder="Description"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="text-sm text-center"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-right text-gray-900">
                            ₹{(item.quantity * item.unitPrice).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeItem(index)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              disabled={items.length === 1}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terms Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4 text-orange-600">
                  <Shield size={20} />
                  <h2 className="text-lg font-bold">Terms & Conditions</h2>
                </div>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={6}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Right Column - Summary & Actions */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Cost Summary Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4 text-orange-600">
                    <TrendingUp size={20} />
                    <h2 className="text-lg font-bold">Cost Summary</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">₹{calculations.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST ({calculations.gstRate}%)</span>
                      <span className="font-medium text-gray-900">₹{calculations.gstAmount.toLocaleString()}</span>
                    </div>
                    <div className="border-t-2 border-orange-500 pt-3">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">Grand Total</span>
                        <span className="font-bold text-xl text-orange-600">₹{calculations.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Button
                      onClick={handleGeneratePDF}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600"
                    >
                      <Download size={18} />
                      Download PDF
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Reset Form
                    </Button>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 p-6">
                  <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <Award size={18} />
                    Why Choose Us?
                  </h3>
                  <ul className="space-y-2 text-sm text-orange-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      25 years panel warranty
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      10 years inverter warranty
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      5 years installation warranty
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      Net metering support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} />
                      24/7 monitoring system
                    </li>
                  </ul>
                </div>

                {/* Contact Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-gray-600">
                      <Phone size={14} className="text-orange-500" />
                      1800-123-1232
                    </p>
                    <p className="flex items-center gap-2 text-gray-600">
                      <Mail size={14} className="text-orange-500" />
                      epc@sunvora.com
                    </p>
                    <p className="flex items-center gap-2 text-gray-600">
                      <MapPin size={14} className="text-orange-500" />
                      Surat, Gujarat
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PreviewSection />
        )}
      </div>
    </div>
  );
};

export default SolarQuotationPage;
