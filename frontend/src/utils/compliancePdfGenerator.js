// PDF Generation Utility for Compliance Documents
import { jsPDF } from 'jspdf';

// Helper to format dates
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Helper to add header
const addHeader = (doc, title, id) => {
    // Add company header
    doc.setFillColor(245, 158, 11); // Amber color
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLAR EPC', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Compliance & Regulatory Management System', 20, 32);
    
    // Add document title box
    doc.setFillColor(255, 255, 255);
    doc.rect(20, 50, 170, 25, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.rect(20, 50, 170, 25, 'S');
    
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 25, 62);
    
    doc.setFontSize(10);
    doc.setTextColor(245, 158, 11);
    doc.text(`Ref: ${id}`, 25, 70);
    
    // Generation date
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 140, 70);
    
    return 85; // Return Y position after header
};

// Helper to add field to PDF
const addField = (doc, label, value, x, y, width = 80) => {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, y);
    
    doc.setFontSize(10);
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'bold');
    const text = value ? String(value) : '—';
    // Handle long text
    if (text.length > 35) {
        const splitText = doc.splitTextToSize(text, width);
        doc.text(splitText, x, y + 5);
        return y + 5 + (splitText.length - 1) * 4;
    }
    doc.text(text, x, y + 5);
    return y + 10;
};

// Helper to add status badge
const addStatusBadge = (doc, status, x, y) => {
    const colors = {
        'Draft': [100, 116, 139],
        'Applied': [245, 158, 11],
        'Approved': [34, 197, 94],
        'Rejected': [239, 68, 68],
        'Connected': [34, 211, 238],
        'Sanctioned': [59, 130, 246],
        'Disbursed': [34, 197, 94],
        'Pending': [245, 158, 11],
        'Scheduled': [59, 130, 246],
        'Passed': [34, 197, 94],
        'Failed': [239, 68, 68],
        'Uploaded': [34, 197, 94],
    };
    
    const color = colors[status] || [128, 128, 128];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(color[0], color[1], color[2]);
    
    const text = String(status);
    const textWidth = doc.getTextWidth(text);
    doc.rect(x, y - 4, textWidth + 10, 10, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(text, x + 5, y + 2);
};

// Helper to add footer
const addFooter = (doc, pageNumber) => {
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(245, 158, 11);
    doc.rect(0, pageHeight - 20, 210, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Solar EPC - Compliance Management System', 20, pageHeight - 10);
    doc.text(`Page ${pageNumber}`, 180, pageHeight - 10);
};

// Generate Net Metering PDF
export const generateNetMeteringPDF = (data) => {
    try {
        const doc = new jsPDF();
        const id = data.id || data.applicationId || data._id || 'N/A';
        
        let y = addHeader(doc, 'NET METERING APPLICATION', id);
        
        // Status badge
        addStatusBadge(doc, data.status || 'Draft', 160, y - 10);
        
        // Section 1: Application Details
        doc.setFillColor(245, 158, 11);
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Application Details', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Application Number', data.applicationNo || data.applicationNumber, 25, y);
        y = addField(doc, 'Applied Date', formatDate(data.appliedDate || data.applicationDate), 110, y - 10);
        y = addField(doc, 'Approval Date', formatDate(data.approvalDate), 25, y);
        y = addField(doc, 'Connection Date', formatDate(data.connectionDate), 110, y - 10);
        y += 5;
        
        // Section 2: Customer Information
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('Customer Information', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Customer Name', data.customer || data.customerName, 25, y);
        y = addField(doc, 'Project ID', data.projectId, 110, y - 10);
        y = addField(doc, 'Site/Location', data.site || data.location, 25, y);
        y = addField(doc, 'System Size', data.systemSize, 110, y - 10);
        y += 5;
        
        // Section 3: DISCOM Information
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('DISCOM Information', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'DISCOM', data.discom, 25, y);
        y = addField(doc, 'Compensation Rate', data.compensationRate, 110, y - 10);
        y = addField(doc, 'Contact Officer', data.discomOfficer, 25, y);
        y = addField(doc, 'Contact Phone', data.discomPhone, 110, y - 10);
        y = addField(doc, 'Bidirectional Meter', data.bidirectionalMeter ? 'Yes ✓' : 'No', 25, y);
        y = addField(doc, 'Meter Installation Date', formatDate(data.meterInstallationDate), 110, y - 10);
        
        addFooter(doc, 1);
        doc.save(`NetMetering_${id}.pdf`);
    } catch (err) {
        console.error('Error generating Net Metering PDF:', err);
        alert('Failed to generate PDF. Please try again.');
    }
};

// Generate Subsidy PDF
export const generateSubsidyPDF = (data) => {
    try {
        const doc = new jsPDF();
        const id = data.id || data.subsidyId || data._id || 'N/A';
        
        let y = addHeader(doc, 'SUBSIDY APPLICATION', id);
        
        // Status badge
        addStatusBadge(doc, data.status || 'Applied', 160, y - 10);
        
        // Section 1: Application Details
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Application Details', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Application Reference', data.applicationRef || data.referenceNo, 25, y);
        y = addField(doc, 'Scheme', data.scheme, 110, y - 10);
        y = addField(doc, 'Applied Date', formatDate(data.appliedDate || data.applicationDate), 25, y);
        y = addField(doc, 'Sanction Date', formatDate(data.sanctionDate), 110, y - 10);
        y = addField(doc, 'Disbursed Date', formatDate(data.disbursedDate), 25, y);
        y += 5;
        
        // Section 2: Customer & System
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('Customer & System Details', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Customer Name', data.customer || data.customerName, 25, y);
        y = addField(doc, 'Project ID', data.projectId, 110, y - 10);
        y = addField(doc, 'System Size', data.systemSize, 25, y);
        y += 5;
        
        // Section 3: Financial Details
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('Financial Details', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Claim Amount', `₹${(data.claimAmount || 0).toLocaleString('en-IN')}`, 25, y);
        y = addField(doc, 'Sanctioned Amount', `₹${(data.sanctionedAmount || 0).toLocaleString('en-IN')}`, 110, y - 10);
        y = addField(doc, 'Disbursed Amount', `₹${(data.disbursedAmount || 0).toLocaleString('en-IN')}`, 25, y);
        y = addField(doc, 'Bank Account', data.bankAccount, 110, y - 10);
        y = addField(doc, 'IFSC Code', data.ifscCode, 25, y);
        y = addField(doc, 'Remarks', data.remarks, 110, y - 10);
        
        addFooter(doc, 1);
        doc.save(`Subsidy_${id}.pdf`);
    } catch (err) {
        console.error('Error generating Subsidy PDF:', err);
        alert('Failed to generate PDF. Please try again.');
    }
};

// Generate Inspection PDF
export const generateInspectionPDF = (data) => {
    try {
        const doc = new jsPDF();
        const id = data.id || data.inspectionId || data._id || 'N/A';
        
        let y = addHeader(doc, 'INSPECTION REPORT', id);
        
        // Status badge
        addStatusBadge(doc, data.status || 'Pending', 160, y - 10);
        
        // Section 1: Inspection Details
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Inspection Details', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Inspection Type', data.type, 25, y);
        y = addField(doc, 'Inspector Name', data.inspector, 110, y - 10);
        y = addField(doc, 'Scheduled Date', formatDate(data.scheduledDate), 25, y);
        y = addField(doc, 'Completed Date', formatDate(data.completedDate), 110, y - 10);
        y += 5;
        
        // Section 2: Project Information
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('Project Information', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Customer Name', data.customer || data.customerName, 25, y);
        y = addField(doc, 'Project ID', data.projectId, 110, y - 10);
        y += 5;
        
        // Section 3: Inspection Results
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('Inspection Results', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Outcome', data.outcome || 'Pending', 25, y);
        y = addField(doc, 'Next Inspection', formatDate(data.nextInspectionDate), 110, y - 10);
        y += 5;
        
        // Remarks box
        doc.setFillColor(245, 158, 11);
        doc.setFillColor(255, 251, 235);
        doc.rect(20, y, 170, 40, 'F');
        doc.setDrawColor(245, 158, 11);
        doc.rect(20, y, 170, 40, 'S');
        
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Remarks / Notes:', 25, y + 8);
        
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const remarks = data.remarks || data.notes || 'No remarks available';
        const splitRemarks = doc.splitTextToSize(remarks, 160);
        doc.text(splitRemarks, 25, y + 16);
        
        // Checklist (if available)
        if (data.checklistItems && data.checklistItems.length > 0) {
            y = 160;
            doc.setFillColor(245, 158, 11);
            doc.rect(20, y, 170, 8, 'F');
            doc.setTextColor(245, 158, 11);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Inspection Checklist', 25, y + 5.5);
            y += 12;
            
            data.checklistItems.forEach((item, index) => {
                doc.setTextColor(51, 51, 51);
                doc.setFontSize(9);
                doc.text(`${index + 1}. ${item}`, 25, y);
                y += 6;
            });
        }
        
        addFooter(doc, 1);
        doc.save(`Inspection_${id}.pdf`);
    } catch (err) {
        console.error('Error generating Inspection PDF:', err);
        alert('Failed to generate PDF. Please try again.');
    }
};

// Generate Document PDF
export const generateDocumentPDF = (data) => {
    try {
        const doc = new jsPDF();
        const id = data.id || data.documentId || data._id || 'N/A';
        
        let y = addHeader(doc, 'COMPLIANCE DOCUMENT', id);
        
        // Status badge
        addStatusBadge(doc, data.status || 'Pending', 160, y - 10);
        
        // Section 1: Document Details
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Document Details', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Document Name', data.name || data.documentName, 25, y);
        y = addField(doc, 'Category', data.category || data.documentType, 110, y - 10);
        y = addField(doc, 'Issuing Authority', data.issuingAuthority, 25, y);
        y = addField(doc, 'Document Date', formatDate(data.documentDate), 110, y - 10);
        y = addField(doc, 'Expiry Date', formatDate(data.expiryDate), 25, y);
        y = addField(doc, 'Required', data.required ? 'Yes' : 'No', 110, y - 10);
        y += 5;
        
        // Section 2: Project Information
        doc.setFillColor(245, 158, 11);
        doc.rect(20, y, 170, 8, 'F');
        doc.setTextColor(245, 158, 11);
        doc.setFontSize(11);
        doc.text('Project Information', 25, y + 5.5);
        y += 15;
        
        y = addField(doc, 'Project Name', data.projectName || data.project, 25, y);
        y = addField(doc, 'Project ID', data.projectId, 110, y - 10);
        y += 5;
        
        // Section 3: File Information
        if (data.fileName) {
            doc.setFillColor(245, 158, 11);
            doc.rect(20, y, 170, 8, 'F');
            doc.setTextColor(245, 158, 11);
            doc.setFontSize(11);
            doc.text('File Information', 25, y + 5.5);
            y += 15;
            
            y = addField(doc, 'File Name', data.fileName, 25, y);
            y = addField(doc, 'File Size', `${((data.fileSize || 0) / 1024).toFixed(2)} KB`, 110, y - 10);
            y = addField(doc, 'MIME Type', data.mimeType, 25, y);
            y = addField(doc, 'Uploaded At', formatDate(data.uploadedAt), 110, y - 10);
            y = addField(doc, 'Uploaded By', data.uploadedBy, 25, y);
        }
        
        // Remarks
        if (data.remarks) {
            y += 5;
            doc.setFillColor(255, 251, 235);
            doc.rect(20, y, 170, 30, 'F');
            doc.setDrawColor(245, 158, 11);
            doc.rect(20, y, 170, 30, 'S');
            
            doc.setTextColor(245, 158, 11);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Remarks:', 25, y + 8);
            
            doc.setTextColor(51, 51, 51);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const splitRemarks = doc.splitTextToSize(data.remarks, 160);
            doc.text(splitRemarks, 25, y + 16);
        }
        
        addFooter(doc, 1);
        doc.save(`Document_${id}.pdf`);
    } catch (err) {
        console.error('Error generating Document PDF:', err);
        alert('Failed to generate PDF. Please try again.');
    }
};

// Main export function
export const generateCompliancePDF = (type, data) => {
    switch (type) {
        case 'nm':
        case 'netMetering':
            generateNetMeteringPDF(data);
            break;
        case 'sub':
        case 'subsidy':
            generateSubsidyPDF(data);
            break;
        case 'ins':
        case 'inspection':
            generateInspectionPDF(data);
            break;
        case 'doc':
        case 'document':
            generateDocumentPDF(data);
            break;
        default:
            console.error('Unknown PDF type:', type);
    }
};

export default generateCompliancePDF;
