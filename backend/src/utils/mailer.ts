import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure nodemailer transporter
    // For production, use actual SMTP credentials from env
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendOtpEmail(email: string, otp: string, name?: string): Promise<void> {
    const toName = name || 'User';
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Solar OS'}" <${process.env.SMTP_USER || 'noreply@solarcorp.com'}>`,
      to: email,
      subject: 'Password Reset OTP - Solar OS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              Hello <strong>${toName}</strong>,
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
              You requested a password reset. Use the following OTP to reset your password:
            </p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #ea580c; letter-spacing: 4px; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
              This OTP will expire in <strong>5 minutes</strong>.
            </p>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
              If you didn't request this, please ignore this email or contact support.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              ${process.env.APP_NAME || 'Solar OS'} © ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      `,
      text: `Hello ${toName},\n\nYour password reset OTP is: ${otp}\n\nThis OTP will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
    };

    // If SMTP not configured, log to console (development mode)
    if (!process.env.SMTP_USER) {
      console.log(`[EMAIL DEV MODE] OTP for ${email}: ${otp}`);
      return;
    }

    await this.transporter.sendMail(mailOptions);
  }
}
