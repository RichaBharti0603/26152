import { Request, Response, NextFunction } from 'express';
import { Log } from './logger';

/**
 * Express middleware to log incoming requests and response times
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Log incoming request
  Log("backend", "info", "express-middleware", `Incoming request: ${method} ${originalUrl}`);

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    let level: "info" | "warn" | "error" = "info";
    if (statusCode >= 400 && statusCode < 500) {
      level = "warn";
    } else if (statusCode >= 500) {
      level = "error";
    }

    Log(
      "backend", 
      level, 
      "express-middleware", 
      `Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms`
    );
  });

  next();
};
