import { Injectable, Logger } from '@nestjs/common';
import { Estimate } from '../schemas/estimate.schema';

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);

  async generateEstimatePdf(estimate: Estimate): Promise<Buffer> {
    try {
      // For now, return a simple HTML-based PDF generation
      // In production, you would use a library like puppeteer, pdfmake, or html-pdf
      const html = this.generateEstimateHtml(estimate);
      
      // Return as buffer (in production, convert HTML to PDF)
      return Buffer.from(html, 'utf-8');
    } catch (error: any) {
      this.logger.error(`PDF generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private generateEstimateHtml(estimate: Estimate): string {
    const itemsHtml = estimate.items?.map((item, index) => `
      <tr>
        <td style="text-align: center; font-weight: 600;">${index + 1}</td>
        <td style="font-weight: 600;">${item.name}</td>
        <td>${item.description || '-'}</td>
        <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
      </tr>
    `).join('') || `
      <tr>
        <td colspan="4" style="text-align: center; color: #6b7280; padding: 30px;">No equipment items added</td>
      </tr>
    `;

    const totalItems = estimate.items?.length || 0;
    const totalQuantity = estimate.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Solar EPC Estimate - ${estimate.estimateNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.5; color: #1f2937; background: #fff; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px; }
    
    /* Header */
    .header { text-align: center; border-bottom: 4px solid #00695c; padding-bottom: 25px; margin-bottom: 35px; }
    .header h1 { color: #00695c; font-size: 32px; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px; }
    .header p { color: #6b7280; font-size: 14px; font-weight: 500; }
    .header .doc-type { display: inline-block; background: #00695c; color: white; padding: 6px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 15px; }
    
    /* Info Cards */
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 35px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
    .info-card h3 { color: #00695c; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; border-bottom: 2px solid #00695c; padding-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 12px; font-weight: 500; }
    .info-value { color: #1f2937; font-size: 13px; font-weight: 600; text-align: right; }
    .info-value.highlight { color: #00695c; font-size: 14px; }
    
    /* Main Content Grid */
    .main-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 30px; margin-bottom: 35px; }
    
    /* Equipment Section */
    .equipment-section { background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .section-header { background: #00695c; color: white; padding: 15px 20px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .equipment-table { width: 100%; border-collapse: collapse; }
    .equipment-table th { background: #f1f5f9; color: #374151; padding: 12px 15px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #00695c; }
    .equipment-table th:nth-child(1) { width: 10%; text-align: center; }
    .equipment-table th:nth-child(2) { width: 35%; }
    .equipment-table th:nth-child(3) { width: 40%; }
    .equipment-table th:nth-child(4) { width: 15%; text-align: center; }
    .equipment-table td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
    .equipment-table tr:nth-child(even) { background: #f8fafc; }
    .equipment-table tr:hover { background: #f1f5f9; }
    .item-number { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #00695c; color: white; border-radius: 50%; font-size: 12px; font-weight: 700; }
    
    /* Cost Summary Section */
    .cost-section { background: #fff; border: 2px solid #00695c; border-radius: 12px; overflow: hidden; }
    .cost-section .section-header { text-align: center; }
    .cost-body { padding: 20px; }
    .cost-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
    .cost-row:last-child { border-bottom: none; }
    .cost-row.total { background: #00695c; color: white; margin: 15px -20px -20px -20px; padding: 15px 20px; border-radius: 0 0 10px 10px; }
    .cost-label { font-size: 13px; color: #4b5563; font-weight: 500; }
    .cost-value { font-size: 14px; color: #1f2937; font-weight: 700; }
    .cost-row.total .cost-label { color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; }
    .cost-row.total .cost-value { color: white; font-size: 20px; font-weight: 700; }
    .gst-row { background: #f0fdfa; margin: 0 -20px; padding: 10px 20px; border-left: 4px solid #00695c; }
    .gst-row .cost-label { color: #00695c; font-weight: 600; }
    .gst-row .cost-value { color: #00695c; font-weight: 700; }
    
    /* Summary Stats */
    .summary-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
    .stat-box { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #00695c; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-top: 4px; }
    
    /* Footer Section */
    .footer-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
    .terms-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; }
    .terms-box h4 { color: #92400e; font-size: 13px; font-weight: 700; margin-bottom: 10px; text-transform: uppercase; }
    .terms-box ul { margin: 0; padding-left: 18px; font-size: 11px; color: #78350f; line-height: 1.8; }
    .terms-box li { margin-bottom: 4px; }
    .signature-box { display: flex; flex-direction: column; justify-content: flex-end; }
    .signature-line { border-top: 2px solid #374151; padding-top: 10px; margin-bottom: 25px; }
    .signature-label { font-size: 12px; color: #6b7280; font-weight: 500; }
    .company-stamp { text-align: right; margin-top: 20px; }
    .stamp-box { display: inline-block; border: 2px dashed #00695c; padding: 15px 25px; border-radius: 8px; color: #00695c; font-size: 12px; font-weight: 600; }
    
    /* Bottom Bar */
    .bottom-bar { margin-top: 40px; padding-top: 20px; border-top: 3px solid #00695c; text-align: center; }
    .bottom-bar p { color: #6b7280; font-size: 11px; font-weight: 500; }
    .bottom-bar .company-name { color: #00695c; font-weight: 700; font-size: 14px; margin-bottom: 5px; }
    
    /* Print Styles */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>SOLAR EPC SOLUTIONS</h1>
      <p>Professional Solar Installation & Engineering Services</p>
      <span class="doc-type">Cost Estimate</span>
    </div>

    <!-- Info Cards -->
    <div class="info-section">
      <div class="info-card">
        <h3>Estimate Details</h3>
        <div class="info-row">
          <span class="info-label">Estimate Number</span>
          <span class="info-value highlight">${estimate.estimateNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${new Date((estimate as any).createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Validity</span>
          <span class="info-value">30 Days</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value" style="text-transform: capitalize; color: #00695c;">${estimate.status}</span>
        </div>
      </div>
      
      <div class="info-card">
        <h3>Customer Details</h3>
        <div class="info-row">
          <span class="info-label">Name</span>
          <span class="info-value highlight">${estimate.customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-value">${estimate.companyName || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Contact</span>
          <span class="info-value">${estimate.customerPhone || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${estimate.projectLocation || 'N/A'}</span>
        </div>
      </div>
    </div>

    <!-- Project Info -->
    <div class="info-card" style="margin-bottom: 35px;">
      <h3>Project Information</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
        <div class="info-row" style="flex-direction: column; border-bottom: none; border-right: 1px dashed #e2e8f0; padding-right: 20px;">
          <span class="info-label">Project Name</span>
          <span class="info-value highlight">${estimate.projectName}</span>
        </div>
        <div class="info-row" style="flex-direction: column; border-bottom: none; border-right: 1px dashed #e2e8f0; padding-right: 20px;">
          <span class="info-label">System Capacity</span>
          <span class="info-value highlight" style="font-size: 18px;">${estimate.systemCapacity} kW</span>
        </div>
        <div class="info-row" style="flex-direction: column; border-bottom: none; border-right: 1px dashed #e2e8f0; padding-right: 20px;">
          <span class="info-label">Project Type</span>
          <span class="info-value">${estimate.projectType}</span>
        </div>
        <div class="info-row" style="flex-direction: column; border-bottom: none;">
          <span class="info-label">Installation</span>
          <span class="info-value">${estimate.installationType}</span>
        </div>
      </div>
    </div>

    <!-- Main Grid: Equipment & Cost -->
    <div class="main-grid">
      <!-- Equipment Section -->
      <div class="equipment-section">
        <div class="section-header">Equipment & Materials</div>
        <table class="equipment-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Item Name</th>
              <th>Description / Specifications</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="padding: 15px 20px; background: #f8fafc; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: right;">
          <strong>Total Items: ${totalItems}</strong> &nbsp;|&nbsp; <strong>Total Quantity: ${totalQuantity}</strong>
        </div>
      </div>

      <!-- Cost Summary Section -->
      <div class="cost-section">
        <div class="section-header">Cost Summary</div>
        <div class="cost-body">
          <div class="cost-row">
            <span class="cost-label">Equipment Cost</span>
            <span class="cost-value">₹${(estimate.equipmentCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row">
            <span class="cost-label">Installation Cost</span>
            <span class="cost-value">₹${(estimate.installationCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row">
            <span class="cost-label">Engineering Cost</span>
            <span class="cost-value">₹${(estimate.engineeringCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row">
            <span class="cost-label">Transportation</span>
            <span class="cost-value">₹${(estimate.transportationCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row">
            <span class="cost-label">Miscellaneous</span>
            <span class="cost-value">₹${(estimate.miscellaneousCost || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row" style="border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 15px;">
            <span class="cost-label" style="font-weight: 700; color: #374151;">Subtotal</span>
            <span class="cost-value" style="font-weight: 700; color: #374151;">₹${(estimate.subtotal || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row gst-row">
            <span class="cost-label">GST (${estimate.gstRate || 18}%)</span>
            <span class="cost-value">₹${(estimate.gstAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div class="cost-row total">
            <span class="cost-label">Grand Total</span>
            <span class="cost-value">₹${(estimate.total || 0).toLocaleString('en-IN')}</span>
          </div>
          
          <!-- Summary Stats -->
          <div class="summary-stats">
            <div class="stat-box">
              <div class="stat-value">${estimate.systemCapacity}</div>
              <div class="stat-label">kW System</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${totalItems}</div>
              <div class="stat-label">Equipment</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">₹${Math.round((estimate.total || 0) / (estimate.systemCapacity || 1)).toLocaleString('en-IN')}</div>
              <div class="stat-label">Per kW</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Section -->
    <div class="footer-section">
      <div class="terms-box">
        <h4>Terms & Conditions</h4>
        <ul>
          <li>This estimate is valid for 30 days from date of issue</li>
          <li>Prices subject to change based on market conditions</li>
          <li>Payment terms: 50% advance, 50% on completion</li>
          <li>Warranty as per manufacturer standards</li>
          <li>Government subsidies to be claimed by customer</li>
          <li>Installation timeline: 4-6 weeks after advance payment</li>
        </ul>
      </div>
      
      <div class="signature-box">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
          <div class="signature-line">
            <span class="signature-label">Customer Signature</span>
          </div>
          <div class="signature-line">
            <span class="signature-label">Authorized Signatory</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div>
            <span class="signature-label">Date & Stamp</span>
          </div>
          <div class="company-stamp">
            <div class="stamp-box">For Sunova Energy Pvt. Ltd.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <div class="company-name">SUNOVA ENERGY PRIVATE LIMITED</div>
      <p>This is a computer-generated estimate. Thank you for choosing our solar services!</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
