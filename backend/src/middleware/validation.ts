// backend/src/middleware/validation.ts - COMPLETE WORKING VERSION
import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

// Helper function to safely extract error messages
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Simple input sanitization (without JSDOM dependency)
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('🚫 Validation errors:', errors.array());
    
    // Format errors in a user-friendly way
    const formattedErrors = errors.array().map(error => {
      if (error.type === 'field') {
        return {
          field: error.path,
          message: error.msg,
          value: error.value
        };
      } else {
        return {
          field: 'unknown',
          message: error.msg,
          value: undefined
        };
      }
    });
    
    return res.status(400).json({
      status: 'error',
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  
  // Sanitize all input after validation passes
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  
  next();
};

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      console.log(`🔑 Rate limit key: ${key} for ${req.path}`);
      return key;
    },
    handler: (req, res) => {
      console.log(`🚫 Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({
        status: 'error',
        error: 'Too many requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Common rate limits
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes  
  10, // 10 requests (working rate limit)
  'Too many API requests, please try again later'
);

export const strictRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  5, // 5 requests
  'Too many requests to this sensitive endpoint'
);

// UUID validation
export const validateUUID = (field: string) => {
  return param(field)
    .isUUID()
    .withMessage(`${field} must be a valid UUID`);
};

// Email validation
export const validateEmail = (field: string) => {
  return body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage(`${field} must be a valid email address`);
};

// Phone validation (international format)
export const validatePhone = (field: string) => {
  return body(field)
    .optional()
    .isMobilePhone('any')
    .withMessage(`${field} must be a valid phone number`);
};

// PIN validation (4 digits)
export const validatePIN = (field: string) => {
  return body(field)
    .isLength({ min: 4, max: 4 })
    .isNumeric()
    .withMessage(`${field} must be exactly 4 digits`);
};

// Name validation (no special characters, reasonable length)
export const validateName = (field: string) => {
  return body(field)
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(`${field} must contain only letters, spaces, hyphens, and apostrophes (1-50 characters)`);
};

// Text validation with length limits
export const validateText = (field: string, maxLength: number = 1000) => {
  return body(field)
    .optional()
    .isLength({ max: maxLength })
    .withMessage(`${field} must be ${maxLength} characters or less`);
};

// Price validation (positive number with up to 2 decimals)
export const validatePrice = (field: string) => {
  return body(field)
    .isFloat({ min: 0 })
    .custom((value) => {
      // Check for at most 2 decimal places
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error('Price must have at most 2 decimal places');
      }
      return true;
    })
    .withMessage(`${field} must be a positive number with at most 2 decimal places`);
};

// Integer validation
export const validateInteger = (field: string, min: number = 0) => {
  return body(field)
    .isInt({ min })
    .withMessage(`${field} must be an integer greater than or equal to ${min}`);
};

// Enum validation
export const validateEnum = (field: string, allowedValues: string[]) => {
  return body(field)
    .isIn(allowedValues)
    .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`);
};

// Array validation
export const validateArray = (field: string, itemValidator?: any) => {
  const validator = body(field).isArray().withMessage(`${field} must be an array`);
  
  if (itemValidator) {
    return validator.custom((array) => {
      array.forEach((item: any, index: number) => {
        if (!itemValidator(item)) {
          throw new Error(`${field}[${index}] is invalid`);
        }
      });
      return true;
    });
  }
  
  return validator;
};

// Date validation
export const validateDate = (field: string) => {
  return body(field)
    .isISO8601()
    .toDate()
    .withMessage(`${field} must be a valid ISO 8601 date`);
};

// Boolean validation
export const validateBoolean = (field: string) => {
  return body(field)
    .isBoolean()
    .withMessage(`${field} must be true or false`);
};

// Pagination validation
export const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater')
];

// Search validation
export const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
  query('filter')
    .optional()
    .isIn(['all', 'active', 'inactive', 'suspended'])
    .withMessage('Filter must be one of: all, active, inactive, suspended')
];

// Request size validation middleware
export const validateRequestSize = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 1024 * 1024; // 1MB
  const contentLength = parseInt(req.get('Content-Length') || '0');
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      status: 'error',
      error: 'Request too large',
      message: 'Request body must be less than 1MB'
    });
  }
  
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// IP validation and blocking
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

export const ipProtection = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    console.log(`🚫 Blocked IP attempt: ${clientIP}`);
    return res.status(403).json({
      status: 'error',
      error: 'Access denied',
      message: 'Your IP address has been blocked'
    });
  }
  
  // Track suspicious activity
  const now = Date.now();
  const suspicious = suspiciousIPs.get(clientIP) || { count: 0, lastSeen: now };
  
  // Reset count if more than 1 hour has passed
  if (now - suspicious.lastSeen > 60 * 60 * 1000) {
    suspicious.count = 0;
  }
  
  suspicious.count++;
  suspicious.lastSeen = now;
  suspiciousIPs.set(clientIP, suspicious);
  
  // Block IP if too many requests
  if (suspicious.count > 1000) {
    blockedIPs.add(clientIP);
    console.log(`🚨 IP blocked for suspicious activity: ${clientIP}`);
  }
  
  next();
};

// Export common validation chains
export const commonValidations = {
  // Member validation
  createMember: [
    validateName('firstName'),
    validateName('lastName'), 
    validateEmail('email'),
    validatePhone('phone'),
    validateUUID('branchId'),
    validateUUID('packageId'),
    handleValidationErrors
  ],
  
  updateMember: [
    validateUUID('id'),
    validateName('firstName').optional(),
    validateName('lastName').optional(),
    validateEmail('email').optional(),
    validatePhone('phone'),
    handleValidationErrors
  ],
  
  // Staff validation
  createStaff: [
    validateName('firstName'),
    validateName('lastName'),
    validateEmail('email'),
    validatePhone('phone'),
    validateEnum('role', ['manager', 'senior_staff', 'associate']),
    validatePIN('pin'),
    validateUUID('branchId'),
    handleValidationErrors
  ],
  
  verifyStaffPin: [
    validateUUID('staffId'),
    validatePIN('pin'),
    handleValidationErrors
  ],
  
  // Package validation
  createPackage: [
    validateText('name', 100),
    validateEnum('type', ['individual', 'couple', 'family']),
    validatePrice('price'),
    validateInteger('duration_months', 1),
    validateInteger('max_members', 1),
    validateArray('features'),
    validateBoolean('is_active'),
    validateUUID('branch_id'),
    handleValidationErrors
  ],
  
  // Branch validation
  createBranch: [
    validateText('name', 100),
    validateText('address', 500),
    validatePhone('phone'),
    validateEmail('email'),
    validateText('hours', 100),
    handleValidationErrors
  ],
  
  // Common parameter validations
  validateId: [validateUUID('id'), handleValidationErrors],
  validateBranchId: [validateUUID('branchId'), handleValidationErrors],
  validatePagination: [...validatePagination, handleValidationErrors],
  validateSearch: [...validateSearch, handleValidationErrors]
};