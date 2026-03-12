import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(req: any, res: any, next: () => void) {
    const path = (req as any).routerPath || (req as any).raw?.url || req.url;
    const method = (req as any).raw?.method || req.method;
    const authHeader = (req.headers as any)?.authorization;
    
    this.logger.log(`[REQUEST MIDDLEWARE] ${method} ${path}`);
    this.logger.log(`[REQUEST MIDDLEWARE] Auth: ${authHeader ? 'YES' : 'NO'}`);
    this.logger.log(`[REQUEST MIDDLEWARE] req.user: ${((req as any).user ? 'Present' : 'undefined')}`);
    
    // Log response status
    const rawRes: any = (res as any).raw || res;
    rawRes?.on?.('finish', () => {
      const statusCode = rawRes?.statusCode ?? (res as any).statusCode;
      this.logger.log(`[REQUEST MIDDLEWARE] ${method} ${path} - Status: ${statusCode}`);
    });
    
    next();
  }
}
