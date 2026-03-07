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
    const itemsHtml = estimate.items?.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.description || '-'}</td>
        <td>${item.category || '-'}</td>
        <td>${item.brand || '-'}</td>
        <td>${item.model || '-'}</td>
        <td>${item.quantity}</td>
        <td>₹${item.unitPrice.toLocaleString('en-IN')}</td>
        <td>₹${item.total.toLocaleString('en-IN')}</td>
      </tr>
    `).join('') || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Solar EPC Estimate - ${estimate.estimateNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 900px; margin: 0 auto; padding: 30px; }
    .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #f97316; font-size: 28px; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .estimate-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
    .estimate-info h3 { color: #f97316; margin-bottom: 15px; font-size: 18px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .info-value { font-size: 14px; color: #1f2937; margin-top: 2px; }
    .section { margin-bottom: 25px; }
    .section h3 { color: #f97316; margin-bottom: 12px; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f97316; color: white; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    tr:nth-child(even) { background: #f9fafb; }
    .summary { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #f97316; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
    .terms { margin-top: 20px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; }
    .terms h4 { color: #92400e; margin-bottom: 8px; }
    .terms p { color: #78350f; font-size: 12px; line-height: 1.5; }
    .signature { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature-box { border-top: 1px solid #374151; padding-top: 10px; text-align: center; }
    .signature-label { font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SOLAR EPC ESTIMATE</h1>
      <p>Professional Solar Installation Services</p>
    </div>

    <div class="estimate-info">
      <h3>Estimate Information</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Estimate Number</span>
          <span class="info-value">${estimate.estimateNumber}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Date</span>
          <span class="info-value">${new Date((estimate as any).createdAt).toLocaleDateString('en-IN')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value" style="text-transform: capitalize;">${estimate.status}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Validity</span>
          <span class="info-value">30 Days</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Customer Information</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Customer Name</span>
          <span class="info-value">${estimate.customerName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Company</span>
          <span class="info-value">${estimate.companyName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Phone</span>
          <span class="info-value">${estimate.customerPhone || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">${estimate.customerEmail || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Address</span>
          <span class="info-value">${estimate.customerAddress || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Project Location</span>
          <span class="info-value">${estimate.projectLocation || 'N/A'}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>Project Details</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Project Name</span>
          <span class="info-value">${estimate.projectName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">System Capacity</span>
          <span class="info-value">${estimate.systemCapacity} kW</span>
        </div>
        <div class="info-item">
          <span class="info-label">Project Type</span>
          <span class="info-value">${estimate.projectType}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Installation Type</span>
          <span class="info-value">${estimate.installationType}</span>
        </div>
      </div>
      ${estimate.projectDescription ? `<p style="margin-top: 15px; color: #4b5563; font-size: 13px;">${estimate.projectDescription}</p>` : ''}
    </div>

    <div class="section">
      <h3>Equipment & Cost Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span>Equipment Cost</span>
        <span>₹${(estimate.equipmentCost || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Installation Cost</span>
        <span>₹${(estimate.installationCost || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Engineering Cost</span>
        <span>₹${(estimate.engineeringCost || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Transportation Cost</span>
        <span>₹${(estimate.transportationCost || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Miscellaneous Cost</span>
        <span>₹${(estimate.miscellaneousCost || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Subtotal</span>
        <span>₹${(estimate.subtotal || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>GST (${estimate.gstRate || 18}%)</span>
        <span>₹${(estimate.gstAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-row">
        <span>Grand Total</span>
        <span>₹${(estimate.total || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="terms">
      <h4>Terms & Conditions</h4>
      <p>${estimate.terms || '1. This estimate is valid for 30 days from the date of issue.<br>2. Prices are subject to change based on market conditions.<br>3. Payment terms: 50% advance, 50% on completion.<br>4. Warranty as per manufacturer standards.<br>5. Government subsidies to be claimed by customer.'}</p>
    </div>

    <div class="signature">
      <div class="signature-box">
        <span class="signature-label">Customer Signature</span>
      </div>
      <div class="signature-box">
        <span class="signature-label">Authorized Signatory</span>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated estimate and does not require a physical signature.</p>
      <p>Thank you for choosing our solar services!</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
