import pino from 'pino';

// Simple logger with basic color codes using ANSI escape codes
class ColorLogger {
  private pinoLogger: pino.Logger;

  constructor() {
    this.pinoLogger = pino({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    });
  }



  // Request logging: Info (green)
  logRequest({method, url, body, auth, ip, userAgent}: {method: string, url: string, body?: any, auth?: string, ip?: string, userAgent?: string}) {
    this.pinoLogger.info('\x1b[32mREQUEST\x1b[0m');
    this.pinoLogger.info(`IP : ${ip}`);
    this.pinoLogger.info(`UserAgent: ${userAgent}`);
    this.pinoLogger.info(`Method: ${method}`);
    this.pinoLogger.info(`URL: ${url}`);
    this.pinoLogger.info(body ?? null, 'Body');
    this.pinoLogger.info(`Authorization: ${auth ?? null}`);
    this.pinoLogger.info('--------------------------🚅🚅🚅🚅🚅🚅-----------------------------');
  }

  // logResponse: green (info), orange/yellow (warn), red (error) depending on status
  logResponse(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    message?: string
  ) {
    let color = '\x1b[32m'; // green for info
    if (statusCode >= 500) color = '\x1b[31m'; // red for error
    else if (statusCode >= 400) color = '\x1b[33m'; // yellow/orange for warn

    let timeColor = '\x1b[32m'; // green
    if (responseTime > 1000) timeColor = '\x1b[31m'; // red
    else if (responseTime > 500) timeColor = '\x1b[33m'; // yellow

    this.pinoLogger.info(color + 'RESPONSE\x1b[0m');
    this.pinoLogger.info(`Method: ${method}`);
    this.pinoLogger.info(`URL: ${url}`);
    this.pinoLogger.info(`Status: ${statusCode}`);
    this.pinoLogger.info(`Time: ${timeColor}${responseTime}ms\x1b[0m`);
    if (message) {
      this.pinoLogger.info(`Message: ${message}`);
    }
    this.pinoLogger.info('--------------------------📤📤📤📤📤📤-----------------------------');
  }

  // Warn level: Orange/yellow if response time is over threshold
  logSlowApi(method: string, url: string, responseTime: number, threshold: number = 1000) {
    if (responseTime > threshold) {
      this.pinoLogger.info('\x1b[33m⚠🐢🐢🐢 SLOW API DETECTED\x1b[0m');
      this.pinoLogger.info(`Method: ${method}`);
      this.pinoLogger.info(`URL: ${url}`);
      this.pinoLogger.info(`Time: \x1b[31m${responseTime}ms\x1b[0m`);
      this.pinoLogger.info(`Threshold: \x1b[33m${threshold}ms\x1b[0m`);
      this.pinoLogger.info('-------------------------🐢🐢🐢🐢🐢🐢-----------------------------');
    }
  }

  // Standard pino methods: info (green), warn (orange), error (red)
  info(message: string, data?: any) {
    if (data) {
      this.pinoLogger.info(data, message);
    } else {
      this.pinoLogger.info(message);
    }
  }

  error(message: string, error?: any) {
    if (error) {
      // Red text for error message
      console.log('\x1b[31m%s\x1b[0m', message, error);
      this.pinoLogger.error({ error: error.message || error, stack: error.stack }, message);
    } else {
      console.log('\x1b[31m%s\x1b[0m', message);
      this.pinoLogger.error(message);
    }
  }

  warn(message: string, data?: any) {
    if (data) {
      console.log('\x1b[33m%s\x1b[0m', message, data);
      this.pinoLogger.warn(data, message);
    } else {
      console.log('\x1b[33m%s\x1b[0m', message);
      this.pinoLogger.warn(message);
    }
  }

  debug(message: string, data?: any) {
    if (data) {
      this.pinoLogger.debug(data, message);
    } else {
      this.pinoLogger.debug(message);
    }
  }
}

// Export singleton instance
const colorLogger = new ColorLogger();
export default colorLogger;

