import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LoggingGuard implements CanActivate {
  private readonly logger = new Logger(LoggingGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path;
    const authHeader = request.headers.authorization;
    
    this.logger.log(`[LOGGING GUARD] Path: ${path}`);
    this.logger.log(`[LOGGING GUARD] Auth Header: ${authHeader ? 'Present' : 'MISSING'}`);
    this.logger.log(`[LOGGING GUARD] req.user: ${JSON.stringify(request.user)}`);
    
    // Always allow - this is just for logging
    return true;
  }
}
