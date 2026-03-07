import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    const method = req.method;
    const authHeader = req.headers.authorization;
    
    this.logger.log(`[REQUEST MIDDLEWARE] ${method} ${path}`);
    this.logger.log(`[REQUEST MIDDLEWARE] Auth: ${authHeader ? 'YES' : 'NO'}`);
    this.logger.log(`[REQUEST MIDDLEWARE] req.user: ${JSON.stringify((req as any).user)}`);
    
    // Log response status
    res.on('finish', () => {
      this.logger.log(`[REQUEST MIDDLEWARE] ${method} ${path} - Status: ${res.statusCode}`);
    });
    
    next();
  }
}
