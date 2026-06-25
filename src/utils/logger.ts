/**
 * Simple logger for SNS module
 */

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[SNS] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[SNS WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[SNS ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG === 'sns') {
      console.debug(`[SNS DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
};
