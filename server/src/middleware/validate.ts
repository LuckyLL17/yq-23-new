import { Request, Response, NextFunction } from 'express';
import { validationError } from '../utils/response';
import { ErrorDetail } from '../types';

export type ValidationRule = {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  message?: string;
};

export type ValidationSchema = {
  body?: Record<string, ValidationRule>;
  params?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
};

function validateValue(value: unknown, rule: ValidationRule, fieldName: string): ErrorDetail | null {
  const isPresent = value !== undefined && value !== null && value !== '';

  if (rule.required && !isPresent) {
    return { field: fieldName, message: rule.message || `${fieldName} is required` };
  }

  if (!isPresent) {
    return null;
  }

  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field: fieldName, message: rule.message || `${fieldName} must be a string` };
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return { field: fieldName, message: `${fieldName} must be at least ${rule.min} characters` };
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return { field: fieldName, message: `${fieldName} must be at most ${rule.max} characters` };
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return { field: fieldName, message: rule.message || `${fieldName} format is invalid` };
      }
      if (rule.enum && !rule.enum.includes(value)) {
        return { field: fieldName, message: `${fieldName} must be one of: ${rule.enum.join(', ')}` };
      }
      break;

    case 'number':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        return { field: fieldName, message: `${fieldName} must be a number` };
      }
      const numValue = Number(value);
      if (rule.min !== undefined && numValue < rule.min) {
        return { field: fieldName, message: `${fieldName} must be at least ${rule.min}` };
      }
      if (rule.max !== undefined && numValue > rule.max) {
        return { field: fieldName, message: `${fieldName} must be at most ${rule.max}` };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return { field: fieldName, message: `${fieldName} must be a boolean` };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return { field: fieldName, message: `${fieldName} must be an array` };
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return { field: fieldName, message: `${fieldName} must have at least ${rule.min} items` };
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return { field: fieldName, message: `${fieldName} must have at most ${rule.max} items` };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { field: fieldName, message: `${fieldName} must be an object` };
      }
      break;

    case 'email':
      if (typeof value !== 'string') {
        return { field: fieldName, message: `${fieldName} must be a string` };
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return { field: fieldName, message: `${fieldName} must be a valid email address` };
      }
      break;
  }

  return null;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ErrorDetail[] = [];

    if (schema.body) {
      for (const [field, rule] of Object.entries(schema.body)) {
        const error = validateValue(req.body[field], rule, field);
        if (error) errors.push(error);
      }
    }

    if (schema.params) {
      for (const [field, rule] of Object.entries(schema.params)) {
        const error = validateValue(req.params[field], rule, field);
        if (error) errors.push(error);
      }
    }

    if (schema.query) {
      for (const [field, rule] of Object.entries(schema.query)) {
        const error = validateValue(req.query[field], rule, field);
        if (error) errors.push(error);
      }
    }

    if (errors.length > 0) {
      return validationError(res, errors);
    }

    next();
  };
}

export function validateIdParam(paramName = 'id') {
  return validate({
    params: {
      [paramName]: {
        type: 'string',
        required: true,
        pattern: /^\d+$/,
        message: `${paramName} must be a valid number`,
      },
    },
  });
}

export function validatePagination() {
  return validate({
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 },
    },
  });
}
