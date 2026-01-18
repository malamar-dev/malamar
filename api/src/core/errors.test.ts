import { describe, expect, test } from 'bun:test';

import {
  AppError,
  BadRequestError,
  ConflictError,
  InternalError,
  isAppError,
  NotFoundError,
  ValidationError,
} from './errors.ts';

describe('AppError', () => {
  test('creates error with correct properties', () => {
    const error = new AppError('Test error', 'NOT_FOUND', 404);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('AppError');
  });

  test('serializes to API response format', () => {
    const error = new AppError('Test error', 'INTERNAL_ERROR', 500);
    const response = error.toResponse();
    expect(response).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Test error',
      },
    });
  });

  test('is instanceof Error', () => {
    const error = new AppError('Test', 'NOT_FOUND', 404);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });
});

describe('NotFoundError', () => {
  test('has correct defaults', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
  });

  test('accepts custom message', () => {
    const error = new NotFoundError('Task not found');
    expect(error.message).toBe('Task not found');
  });

  test('is instanceof AppError', () => {
    const error = new NotFoundError();
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof NotFoundError).toBe(true);
  });
});

describe('ValidationError', () => {
  test('has correct defaults', () => {
    const error = new ValidationError();
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  test('accepts custom message', () => {
    const error = new ValidationError('Invalid email format');
    expect(error.message).toBe('Invalid email format');
  });
});

describe('ConflictError', () => {
  test('has correct defaults', () => {
    const error = new ConflictError();
    expect(error.message).toBe('Resource conflict');
    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.name).toBe('ConflictError');
  });

  test('accepts custom message', () => {
    const error = new ConflictError('Agent name already exists');
    expect(error.message).toBe('Agent name already exists');
  });
});

describe('InternalError', () => {
  test('has correct defaults', () => {
    const error = new InternalError();
    expect(error.message).toBe('Internal server error');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('InternalError');
  });

  test('accepts custom message', () => {
    const error = new InternalError('Database connection failed');
    expect(error.message).toBe('Database connection failed');
  });
});

describe('BadRequestError', () => {
  test('has correct defaults', () => {
    const error = new BadRequestError();
    expect(error.message).toBe('Bad request');
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('BadRequestError');
  });

  test('accepts custom message', () => {
    const error = new BadRequestError('Missing required field');
    expect(error.message).toBe('Missing required field');
  });
});

describe('isAppError', () => {
  test('returns true for AppError instances', () => {
    expect(isAppError(new AppError('test', 'NOT_FOUND', 404))).toBe(true);
    expect(isAppError(new NotFoundError())).toBe(true);
    expect(isAppError(new ValidationError())).toBe(true);
    expect(isAppError(new ConflictError())).toBe(true);
    expect(isAppError(new InternalError())).toBe(true);
    expect(isAppError(new BadRequestError())).toBe(true);
  });

  test('returns false for non-AppError', () => {
    expect(isAppError(new Error('test'))).toBe(false);
    expect(isAppError('error string')).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError({ code: 'NOT_FOUND' })).toBe(false);
  });
});
