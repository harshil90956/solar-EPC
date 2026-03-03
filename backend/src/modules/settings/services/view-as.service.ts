import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

// In-memory storage for view-as sessions (use Redis in production)
interface ViewAsSession {
  adminUserId: string;
  targetUserId: string;
  targetRole: string;
  startedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ViewAsService {
  private readonly logger = new Logger(ViewAsService.name);
  private readonly sessions = new Map<string, ViewAsSession>();
  private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Start a view-as session
   */
  async startSession(
    adminUserId: string,
    targetUserId: string,
    targetRole: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<ViewAsSession> {
    // Check if admin already has an active session
    const existingSession = this.getSession(adminUserId);
    if (existingSession) {
      throw new BadRequestException('Already viewing as another user. End current session first.');
    }

    // Prevent viewing as self
    if (adminUserId === targetUserId) {
      throw new BadRequestException('Cannot view as yourself');
    }

    const now = new Date();
    const session: ViewAsSession = {
      adminUserId,
      targetUserId,
      targetRole,
      startedAt: now,
      expiresAt: new Date(now.getTime() + this.SESSION_TTL),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };

    this.sessions.set(adminUserId, session);
    
    this.logger.log(`View-as session started: ${adminUserId} -> ${targetUserId}`);
    
    return session;
  }

  /**
   * Get active session for admin
   */
  getSession(adminUserId: string): ViewAsSession | null {
    const session = this.sessions.get(adminUserId);
    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(adminUserId);
      return null;
    }

    return session;
  }

  /**
   * End a view-as session
   */
  endSession(adminUserId: string): boolean {
    const deleted = this.sessions.delete(adminUserId);
    if (deleted) {
      this.logger.log(`View-as session ended: ${adminUserId}`);
    }
    return deleted;
  }

  /**
   * Get effective user context (for use in permission checks)
   */
  getEffectiveContext(
    adminUserId: string,
    adminRole: string,
  ): { userId: string; role: string; isViewAs: boolean } {
    const session = this.getSession(adminUserId);
    
    if (session) {
      return {
        userId: session.targetUserId,
        role: session.targetRole,
        isViewAs: true,
      };
    }

    return {
      userId: adminUserId,
      role: adminRole,
      isViewAs: false,
    };
  }

  /**
   * Preview target user's permissions without starting session
   */
  async previewPermissions(
    targetUserId: string,
    targetRole: string,
  ): Promise<{ userId: string; role: string }> {
    return {
      userId: targetUserId,
      role: targetRole,
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [adminId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(adminId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired view-as sessions`);
    }

    return cleaned;
  }

  /**
   * Get all active sessions (for admin monitoring)
   */
  getAllActiveSessions(): Array<ViewAsSession & { remainingMinutes: number }> {
    const now = new Date();
    const sessions: Array<ViewAsSession & { remainingMinutes: number }> = [];

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt) {
        const remainingMs = session.expiresAt.getTime() - now.getTime();
        sessions.push({
          ...session,
          remainingMinutes: Math.ceil(remainingMs / 60000),
        });
      }
    }

    return sessions;
  }
}
