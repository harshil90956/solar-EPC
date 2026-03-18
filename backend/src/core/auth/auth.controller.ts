import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { AuthService } from './auth.service';
import { OtpService } from '../../services/otp.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'enacle-crm';

interface AuthenticatedRequest {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Send OTP for password reset
  @Post('send-otp')
  async sendOtp(@Body() dto: { email: string }) {
    const { email } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists (users or employees)
    const user = await this.authService.findUserByEmail(normalizedEmail);

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return {
        success: true,
        message: 'If an account exists with this email, an OTP has been sent.',
      };
    }

    // Send OTP
    const result = await this.otpService.sendOtp(
      normalizedEmail,
      user.userType as 'user' | 'employee',
      user.name,
    );

    // If rate limited, return remaining time
    if (!result.success && result.remainingTime) {
      return {
        success: false,
        message: result.message,
        remainingTime: result.remainingTime,
      };
    }

    return {
      success: true,
      message: result.message,
    };
  }

  // Reset Password with OTP verification (step-based flow)
  @Post('verify-otp')
  async verifyOtp(@Body() dto: { email: string; otp: string }) {
    const { email, otp } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP
    const verifyResult = await this.otpService.verifyOtp(normalizedEmail, otp);

    if (!verifyResult.success || !verifyResult.userType) {
      throw new BadRequestException(verifyResult.message || 'OTP verification failed');
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      email: normalizedEmail,
      userType: verifyResult.userType,
    };
  }

  // Reset Password (after OTP verified in previous step)
  @Post('reset-password')
  async resetPassword(@Body() dto: { email: string; newPassword: string }) {
    const { email, newPassword } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    // Check if user exists and get type
    const user = await this.authService.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Reset password
    await this.authService.resetPasswordByEmail(
      normalizedEmail,
      newPassword,
      user.userType,
    );

    // Delete any remaining OTP for this email
    this.otpService.deleteOtp(normalizedEmail);

    return {
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    };
  }

  @Get('users')
  async getUsers(@Query('tenantId') tenantId: string, @Query('role') role?: string) {
    return this.authService.getUsersByTenantAndRole(tenantId, role);
  }

  @Post('users')
  async createUser(@Query('tenantId') tenantId: string, @Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(tenantId, createUserDto);
  }

  @Get('users/:userId')
  async getUser(@Query('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.authService.findOne(tenantId, userId);
  }

  @Patch('users/:userId')
  async updateUser(@Query('tenantId') tenantId: string, @Param('userId') userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.updateUser(tenantId, userId, updateUserDto);
  }

  @Delete('users/:userId')
  async deleteUser(@Query('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.authService.deleteUser(tenantId, userId);
  }

  // Profile endpoints
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('profile/upload-image')
  @UseGuards(JwtAuthGuard)
  async uploadProfileImage(@Request() req: any) {
    // Use Fastify multipart to get the file
    const file = await req.file();

    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    // Read file buffer
    const buffer = await file.toBuffer();

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 5MB.');
    }

    const userId = req.user.id;
    const fileExtension = (file.filename || '').split('.').pop() || 'jpg';
    const fileName = `profiles/${userId}/${randomUUID()}.${fileExtension}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.mimetype,
      }),
    );

    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-2'}.amazonaws.com/${fileName}`;

    // Update user profile with new image URL
    await this.authService.updateProfileImage(userId, imageUrl);

    return {
      success: true,
      imageUrl,
      message: 'Profile image uploaded successfully',
    };
  }

  @Delete('profile/image')
  @UseGuards(JwtAuthGuard)
  async deleteProfileImage(@Request() req: AuthenticatedRequest) {
    const user = await this.authService.getProfile(req.user.id);

    if (user.profileImage) {
      // Extract key from URL
      const urlParts = user.profileImage.split('.amazonaws.com/');
      if (urlParts.length > 1) {
        const key = urlParts[1];
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            }),
          );
        } catch (error) {
          console.error('Failed to delete image from S3:', error);
        }
      }

      // Remove image reference from user
      await this.authService.updateProfileImage(req.user.id, null);
    }

    return {
      success: true,
      message: 'Profile image removed successfully',
    };
  }
}
