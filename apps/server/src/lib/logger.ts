/**
 * Simple logger utility for server-side logging
 * Provides colored console output for better visibility
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  SUCCESS = "SUCCESS",
}

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = getTimestamp();
  const color =
    level === LogLevel.ERROR
      ? colors.red
      : level === LogLevel.WARN
      ? colors.yellow
      : level === LogLevel.SUCCESS
      ? colors.green
      : level === LogLevel.DEBUG
      ? colors.cyan
      : colors.blue;

  let output = `${colors.dim}[${timestamp}]${colors.reset} ${color}${colors.bright}[${level}]${colors.reset} ${message}`;

  if (data !== undefined) {
    output += `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}`;
  }

  return output;
}

export const logger = {
  debug: (message: string, data?: any) => {
    console.log(formatMessage(LogLevel.DEBUG, message, data));
  },

  info: (message: string, data?: any) => {
    console.log(formatMessage(LogLevel.INFO, message, data));
  },

  warn: (message: string, data?: any) => {
    console.warn(formatMessage(LogLevel.WARN, message, data));
  },

  error: (message: string, error?: any) => {
    const errorData =
      error instanceof Error
        ? {
            stack: error.stack,
            ...error,
          }
        : error;
    console.error(formatMessage(LogLevel.ERROR, message, errorData));
  },

  success: (message: string, data?: any) => {
    console.log(formatMessage(LogLevel.SUCCESS, message, data));
  },

  // Email-specific logging
  email: {
    sending: (to: string, subject: string) => {
      logger.info(`📧 Sending email to ${to}`, { subject });
    },
    sent: (to: string, emailId?: string) => {
      logger.success(`✅ Email sent successfully to ${to}`, { emailId });
    },
    failed: (to: string, error: any) => {
      logger.error(`❌ Failed to send email to ${to}`, error);
    },
  },

  // Auth-specific logging
  auth: {
    magicLinkRequested: (email: string) => {
      logger.info(`🔐 Magic link requested for ${email}`);
    },
    magicLinkSent: (email: string) => {
      logger.success(`✨ Magic link sent to ${email}`);
    },
    signIn: (email: string, method: string) => {
      logger.info(`👤 User signed in: ${email} (${method})`);
    },
    signOut: (email: string) => {
      logger.info(`👋 User signed out: ${email}`);
    },
  },
};
