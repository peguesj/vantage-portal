import { z } from 'zod';

/**
 * Base error class for WHMCS API errors
 */
export class WhmcsError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WhmcsError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, WhmcsError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Authentication error (invalid credentials or access key)
 */
export class WhmcsAuthenticationError extends WhmcsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'WhmcsAuthenticationError';
    Object.setPrototypeOf(this, WhmcsAuthenticationError.prototype);
  }
}

/**
 * Authorization error (insufficient permissions)
 */
export class WhmcsAuthorizationError extends WhmcsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'WhmcsAuthorizationError';
    Object.setPrototypeOf(this, WhmcsAuthorizationError.prototype);
  }
}

/**
 * Resource not found error
 */
export class WhmcsNotFoundError extends WhmcsError {
  constructor(
    resource: string,
    identifier?: string | number,
    details?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'WhmcsNotFoundError';
    Object.setPrototypeOf(this, WhmcsNotFoundError.prototype);
  }
}

/**
 * Validation error (invalid request parameters)
 */
export class WhmcsValidationError extends WhmcsError {
  public readonly validationErrors: z.ZodError | undefined;

  constructor(
    message: string,
    validationErrors?: z.ZodError,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'WhmcsValidationError';
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, WhmcsValidationError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors?.errors,
    };
  }
}

/**
 * Rate limit exceeded error
 */
export class WhmcsRateLimitError extends WhmcsError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
    this.name = 'WhmcsRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, WhmcsRateLimitError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Network/connection error
 */
export class WhmcsNetworkError extends WhmcsError {
  public readonly originalError?: Error;

  constructor(
    message: string,
    originalError?: Error,
    details?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'WhmcsNetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, WhmcsNetworkError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Timeout error
 */
export class WhmcsTimeoutError extends WhmcsError {
  public readonly timeout: number;

  constructor(
    message: string,
    timeout: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT', 408, details);
    this.name = 'WhmcsTimeoutError';
    this.timeout = timeout;
    Object.setPrototypeOf(this, WhmcsTimeoutError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeout: this.timeout,
    };
  }
}

/**
 * API response error (WHMCS returned error result)
 */
export class WhmcsApiError extends WhmcsError {
  public readonly action: string;

  constructor(
    message: string,
    action: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'API_ERROR', 400, details);
    this.name = 'WhmcsApiError';
    this.action = action;
    Object.setPrototypeOf(this, WhmcsApiError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      action: this.action,
    };
  }
}

/**
 * Error codes for common WHMCS API errors
 */
export const WhmcsErrorCodes = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid API credentials',
  INVALID_ACCESS_KEY: 'Invalid or missing access key',
  ACCESS_DENIED: 'Access denied',
  IP_NOT_WHITELISTED: 'IP not whitelisted',

  // Resource errors
  CLIENT_NOT_FOUND: 'Client ID Not Found',
  ORDER_NOT_FOUND: 'Order ID Not Found',
  INVOICE_NOT_FOUND: 'Invoice ID Not Found',
  TICKET_NOT_FOUND: 'Ticket ID Not Found',
  DOMAIN_NOT_FOUND: 'Domain ID Not Found',
  PRODUCT_NOT_FOUND: 'Product ID Not Found',
  SERVICE_NOT_FOUND: 'Service ID Not Found',

  // Validation errors
  REQUIRED_FIELD_MISSING: 'A required field is missing',
  INVALID_EMAIL: 'Invalid email address',
  DUPLICATE_EMAIL: 'A client already exists with that email address',

  // Domain errors
  DOMAIN_NOT_AVAILABLE: 'Domain not available',
  REGISTRAR_ERROR: 'Registrar Error',
  DOMAIN_TRANSFER_FAILED: 'Domain Transfer Failed',

  // Payment errors
  PAYMENT_FAILED: 'Payment Failed',
  INVALID_GATEWAY: 'Invalid or inactive payment gateway',
} as const;

export type WhmcsErrorCode =
  (typeof WhmcsErrorCodes)[keyof typeof WhmcsErrorCodes];

/**
 * Parse WHMCS API error response and throw appropriate error
 */
export function parseWhmcsError(
  action: string,
  message: string,
  _statusCode?: number
): never {
  const lowerMessage = message.toLowerCase();

  // Check for authentication errors
  if (
    lowerMessage.includes('invalid') &&
    (lowerMessage.includes('credentials') ||
      lowerMessage.includes('identifier') ||
      lowerMessage.includes('secret'))
  ) {
    throw new WhmcsAuthenticationError(message);
  }

  if (
    lowerMessage.includes('access') &&
    (lowerMessage.includes('denied') || lowerMessage.includes('key'))
  ) {
    throw new WhmcsAuthenticationError(message);
  }

  if (lowerMessage.includes('ip') && lowerMessage.includes('whitelist')) {
    throw new WhmcsAuthorizationError(message);
  }

  // Check for not found errors
  if (lowerMessage.includes('not found')) {
    if (lowerMessage.includes('client')) {
      throw new WhmcsNotFoundError('Client');
    }
    if (lowerMessage.includes('order')) {
      throw new WhmcsNotFoundError('Order');
    }
    if (lowerMessage.includes('invoice')) {
      throw new WhmcsNotFoundError('Invoice');
    }
    if (lowerMessage.includes('ticket')) {
      throw new WhmcsNotFoundError('Ticket');
    }
    if (lowerMessage.includes('domain')) {
      throw new WhmcsNotFoundError('Domain');
    }
    if (lowerMessage.includes('product')) {
      throw new WhmcsNotFoundError('Product');
    }
    if (lowerMessage.includes('service')) {
      throw new WhmcsNotFoundError('Service');
    }
    throw new WhmcsNotFoundError('Resource');
  }

  // Check for rate limit errors
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests')
  ) {
    throw new WhmcsRateLimitError(message);
  }

  // Default to API error
  throw new WhmcsApiError(message, action);
}

/**
 * Type guard to check if an error is a WHMCS error
 */
export function isWhmcsError(error: unknown): error is WhmcsError {
  return error instanceof WhmcsError;
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WhmcsNetworkError) return true;
  if (error instanceof WhmcsTimeoutError) return true;
  if (error instanceof WhmcsRateLimitError) return true;

  // Check for specific HTTP status codes
  if (error instanceof WhmcsError && error.statusCode) {
    return [408, 429, 500, 502, 503, 504].includes(error.statusCode);
  }

  return false;
}
