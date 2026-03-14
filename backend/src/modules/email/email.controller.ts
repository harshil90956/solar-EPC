import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { EmailService } from './email.service';
import { PdfService } from '../quotation/services/pdf.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

interface SendEmailDto {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SendDocumentEmailDto {
  to: string;
  documentId: string;
  documentType: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  total: number;
  notes?: string;
  from?: string; // Dynamic sender email
}

@Controller('email')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('test')
  async testEmail() {
    return this.emailService.testConnection();
  }

  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    const result = await this.emailService.sendEmail(dto.to, dto.subject, dto.text, dto.html);
    return result;
  }

  @Post('send-document')
  async sendDocumentEmail(@Body() dto: SendDocumentEmailDto) {
    try {
      // Generate PDF from document data
      const pdfData = {
        quotationId: dto.documentId,
        date: new Date().toLocaleDateString(),
        validUntil: '30 days from date',
        status: dto.documentType === 'quotation' ? 'Quotation' : 'Estimate',
        customerName: dto.customerName,
        materials: dto.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total,
          category: 'Solar Equipment',
          unit: 'pcs'
        })),
        materialTotal: dto.total,
        installationCost: 0,
        transportCost: 0,
        gstPercentage: 18,
        tax: Math.round(dto.total * 0.18),
        finalQuotationPrice: Math.round(dto.total * 1.18),
        notes: dto.notes || '',
        systemConfig: {
          systemSize: 5,
          panelCount: 10,
          inverterType: 'String Inverter',
          batteryOption: 'Grid-Tied (No Battery)',
          mountingStructure: 'Rooftop Mount'
        }
      };

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateQuotationPdf(pdfData);

      // Send email with PDF attachment
      const subject = dto.documentType === 'quotation' 
        ? `Solar Quotation - ${dto.documentId}` 
        : `Estimate - ${dto.documentId}`;
      
      const text = `Dear ${dto.customerName},\n\nPlease find attached your ${dto.documentType} from our company.\n\nTotal Amount: ₹${dto.total.toLocaleString()}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nSolar Company Team`;

      const result = await this.emailService.sendEmail(
        dto.to,
        subject,
        text,
        undefined,
        [{
          filename: `${dto.documentType}_${dto.documentId}.pdf`,
          content: pdfBuffer,
        }],
        dto.from // Dynamic sender email
      );

      return {
        ...result,
        pdfGenerated: true,
        documentId: dto.documentId,
      };
    } catch (error: any) {
      console.error('Error sending document email:', error);
      return {
        success: false,
        message: `Failed to send document email: ${error?.message || 'Unknown error'}`,
        pdfGenerated: false,
      };
    }
  }
}
