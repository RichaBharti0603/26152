import type { Request, Response, NextFunction } from 'express';
import { Log } from './logger.js';

/**
 * Express middleware to log incoming requests and response times
 */
const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Log incoming request
  Log("backend", "info", "middleware", `Incoming request: ${method} ${originalUrl}`);

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
      "middleware", 
      `Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms`
    );
  });

  next();
};

export default loggingMiddleware;
