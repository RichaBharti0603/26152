import axios from 'axios';

export type Stack = "backend" | "frontend";
export type Level = "debug" | "info" | "warn" | "error" | "fatal";
export type Package =
  | "cache"
  | "controller"
  | "cron_job"
  | "db"
  | "domain"
  | "handler"
  | "repository"
  | "route"
  | "service"
  | "middleware"
  | "auth"
  | "config"
  | "utils";

const VALID_STACKS = new Set(["backend", "frontend"]);
const VALID_LEVELS = new Set(["debug", "info", "warn", "error", "fatal"]);
const VALID_PACKAGES = new Set([
  "cache", "controller", "cron_job", "db", "domain", 
  "handler", "repository", "route", "service", 
  "middleware", "auth", "config", "utils"
]);

/**
 * Reusable Log function
 */
export const Log = async (
  stack: Stack,
  level: Level,
  pkg: Package,
  message: string
): Promise<void> => {
  // 1. Validation and lowercase enforcement
  const safeStack = stack?.toLowerCase() as Stack;
  const safeLevel = level?.toLowerCase() as Level;
  const safePkg = pkg?.toLowerCase() as Package;

  if (!VALID_STACKS.has(safeStack)) {
    console.error(`[LOGGER ERROR] Invalid stack: ${stack}. Must be one of: backend, frontend`);
    return;
  }
  if (!VALID_LEVELS.has(safeLevel)) {
    console.error(`[LOGGER ERROR] Invalid level: ${level}. Must be one of: debug, info, warn, error, fatal`);
    return;
  }
  if (!VALID_PACKAGES.has(safePkg)) {
    console.error(`[LOGGER ERROR] Invalid package: ${pkg}.`);
    return;
  }

  const timestamp = new Date().toISOString();
  
  // Format for console
  const consoleMessage = `[${timestamp}] [${safeLevel.toUpperCase()}] [${safeStack}] [${safePkg}] ${message}`;
  
  // Print to console based on level
  switch (safeLevel) {
    case "info": console.info(consoleMessage); break;
    case "warn": console.warn(consoleMessage); break;
    case "error":
    case "fatal": console.error(consoleMessage); break;
    case "debug": console.debug(consoleMessage); break;
    default: console.log(consoleMessage);
  }

  // Send to external API using axios
  const apiUrl = process.env.LOG_API_URL || "http://20.207.122.201/evaluation-service/logs";
  const token = process.env.ACCESS_TOKEN;

  // The STRICT body format according to instructions
  const payload = {
    stack: safeStack,
    level: safeLevel,
    package: safePkg,
    message,
    timestamp // Auto-added
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Retry logic: 1 retry if API fails
  let retries = 1;
  while (retries >= 0) {
    try {
      await axios.post(apiUrl, payload, { headers, timeout: 5000 });
      break; // Success, exit retry loop
    } catch (error) {
      if (retries === 0) {
        // Final failure, gracefully handle without crashing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[${new Date().toISOString()}] [ERROR] [logger] Failed to send log to API after retry: ${errorMessage}`);
      }
      retries--;
    }
  }
};
