import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    // Log SMTP configuration (without password)
    this.logger.log(`SMTP Configuration: HOST=${process.env.SMTP_HOST || 'smtp.gmail.com'}, PORT=${process.env.SMTP_PORT || 587}, USER=${process.env.SMTP_USER || 'NOT_SET'}`);
    
    // Configure nodemailer with SMTP settings
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
    
    // Verify transporter configuration
    this.verifyTransporter();
  }
  
  private async verifyTransporter() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP transporter verified successfully');
    } catch (error: any) {
      this.logger.error(`SMTP transporter verification failed: ${error?.message}`);
    }
  }

  async sendEmail(
    to: string, 
    subject: string, 
    text: string, 
    html?: string, 
    attachments?: any[],
    from?: string
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      // Check if SMTP is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.error('SMTP not configured: SMTP_USER or SMTP_PASS missing');
        return { 
          success: false, 
          message: 'SMTP not configured. Please set SMTP_USER and SMTP_PASS in .env file' 
        };
      }
      
      this.logger.log(`Sending email to: ${to}, subject: ${subject}, from: ${from || process.env.SMTP_USER}`);

      const info = await this.transporter.sendMail({
        from: from || process.env.SMTP_USER,
        to,
        subject,
        text,
        html: html || `<pre style="font-family: Arial, sans-serif; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</pre>`,
        attachments,
      });

      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return { success: true, message: 'Email sent successfully', messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Error sending email: ${error?.message}`, error);
      return { success: false, message: `Failed to send email: ${error?.message || 'Unknown error'}` };
    }
  }
  
  // Test SMTP configuration
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return { 
          success: false, 
          message: 'SMTP not configured. Please set SMTP_USER and SMTP_PASS' 
        };
      }
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection verified' };
    } catch (error: any) {
      return { success: false, message: `SMTP connection failed: ${error?.message}` };
    }
  }
}
