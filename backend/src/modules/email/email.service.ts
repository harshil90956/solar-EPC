import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure nodemailer with SMTP settings
    // You can configure this with your actual SMTP provider (Gmail, SendGrid, etc.)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      // Check if SMTP is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return { 
          success: false, 
          message: 'SMTP not configured. Please set SMTP_USER and SMTP_PASS in .env file' 
        };
      }

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html: html || `<pre style="font-family: Arial, sans-serif; line-height: 1.6;">${text.replace(/\n/g, '<br>')}</pre>`,
      });

      console.log('Email sent:', info.messageId);
      return { success: true, message: 'Email sent successfully', messageId: info.messageId };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return { success: false, message: `Failed to send email: ${error?.message || 'Unknown error'}` };
    }
  }
}
