import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MailerService } from '../utils/mailer';

interface OtpStore {
  hashedOtp: string;
  expiresAt: Date;
  userType: 'user' | 'employee';
  attempts: number;
  maxAttempts: number;
  lastSentAt: Date;
}

@Injectable()
export class OtpService {
  // In-memory store (use Redis in production)
  private otpStore: Map<string, OtpStore> = new Map();
  private readonly RESEND_COOLDOWN = 30 * 1000; // 30 seconds
  private readonly OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  constructor(private readonly mailerService: MailerService) {}

  // Generate 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash OTP before storing
  async hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  // Verify OTP against hash
  async verifyOtpHash(otp: string, hashedOtp: string): Promise<boolean> {
    return bcrypt.compare(otp, hashedOtp);
  }

  // Send OTP with rate limiting
  async sendOtp(
    email: string,
    userType: 'user' | 'employee',
    name?: string,
  ): Promise<{ success: boolean; message: string; remainingTime?: number }> {
    const normalizedEmail = email.toLowerCase().trim();
    const stored = this.otpStore.get(normalizedEmail);

    // Check rate limiting (30 seconds cooldown)
    if (stored && stored.lastSentAt) {
      const timeSinceLastSend = Date.now() - stored.lastSentAt.getTime();
      if (timeSinceLastSend < this.RESEND_COOLDOWN) {
        const remainingTime = Math.ceil(
          (this.RESEND_COOLDOWN - timeSinceLastSend) / 1000,
        );
        return {
          success: false,
          message: `Please wait ${remainingTime} seconds before requesting a new OTP`,
          remainingTime,
        };
      }
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const hashedOtp = await this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY);

    // Store hashed OTP
    this.otpStore.set(normalizedEmail, {
      hashedOtp,
      expiresAt,
      userType,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      lastSentAt: new Date(),
    });

    // Send email
    await this.mailerService.sendOtpEmail(normalizedEmail, otp, name);

    return {
      success: true,
      message: 'OTP sent successfully to your email',
    };
  }

  // Verify OTP with attempt tracking
  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ success: boolean; message: string; userType?: 'user' | 'employee' }> {
    const normalizedEmail = email.toLowerCase().trim();
    const stored = this.otpStore.get(normalizedEmail);

    if (!stored) {
      throw new BadRequestException('OTP not found or expired. Please request a new one.');
    }

    // Check expiry
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check max attempts
    if (stored.attempts >= stored.maxAttempts) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    // Verify OTP against hash
    const isValid = await this.verifyOtpHash(otp, stored.hashedOtp);

    if (!isValid) {
      stored.attempts++;
      const remainingAttempts = stored.maxAttempts - stored.attempts;

      if (stored.attempts >= stored.maxAttempts) {
        this.otpStore.delete(normalizedEmail);
        throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
      }

      throw new BadRequestException(
        `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
      );
    }

    // OTP verified - return user type but don't delete yet (delete after password reset)
    return {
      success: true,
      message: 'OTP verified successfully',
      userType: stored.userType,
    };
  }

  // Delete OTP after successful password reset
  deleteOtp(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    this.otpStore.delete(normalizedEmail);
  }

  // Get remaining cooldown time
  getRemainingCooldown(email: string): number {
    const normalizedEmail = email.toLowerCase().trim();
    const stored = this.otpStore.get(normalizedEmail);

    if (!stored || !stored.lastSentAt) return 0;

    const timeSinceLastSend = Date.now() - stored.lastSentAt.getTime();
    const remaining = Math.max(0, this.RESEND_COOLDOWN - timeSinceLastSend);
    return Math.ceil(remaining / 1000);
  }
}
