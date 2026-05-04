import axios from 'axios';

export type LogLevel = "info" | "warn" | "error" | "fatal" | "debug";

/**
 * Reusable Log function
 * @param stack The stack or service name (e.g., 'backend', 'frontend')
 * @param level Log severity level
 * @param pkg The package or module originating the log
 * @param message The log message
 */
export const Log = async (
  stack: string,
  level: LogLevel,
  pkg: string,
  message: string
): Promise<void> => {
  const timestamp = new Date().toISOString();
  
  // Format for console
  const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] [${stack}] [${pkg}] ${message}`;
  
  // Print to console based on level
  switch (level) {
    case "info":
      console.info(consoleMessage);
      break;
    case "warn":
      console.warn(consoleMessage);
      break;
    case "error":
    case "fatal":
      console.error(consoleMessage);
      break;
    case "debug":
      console.debug(consoleMessage);
      break;
    default:
      console.log(consoleMessage);
  }

  // Send to external API using axios
  const apiUrl = process.env.LOG_API_URL;
  const token = process.env.ACCESS_TOKEN;

  if (apiUrl) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Send logs to external API
      await axios.post(
        apiUrl,
        {
          timestamp,
          stack,
          level,
          package: pkg,
          message
        },
        { headers }
      );
    } catch (error) {
      // Handle API failure gracefully (no crash)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${new Date().toISOString()}] [ERROR] [logger] Failed to send log to API: ${errorMessage}`);
    }
  }
};
