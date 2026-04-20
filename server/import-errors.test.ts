import { describe, it, expect } from 'vitest';
import { generateErrorMessage } from '../client/src/components/ErrorAlert';

describe('Import Error Messages', () => {
  describe('Error Message Generation', () => {
    it('should generate INVALID_FORMAT error', () => {
      const error = generateErrorMessage('INVALID_FORMAT');
      expect(error.type).toBe('format');
      expect(error.title).toContain('inválido');
      expect(error.suggestion).toContain('xlsx');
    });

    it('should generate MISSING_REQUIRED_FIELD error with row and field info', () => {
      const error = generateErrorMessage('MISSING_REQUIRED_FIELD', {
        field: 'Empresa',
        row: 5,
      });
      expect(error.type).toBe('validation');
      expect(error.rowNumber).toBe(5);
      expect(error.field).toBe('Empresa');
      expect(error.suggestion).toContain('Empresa');
    });

    it('should generate INVALID_EMAIL error', () => {
      const error = generateErrorMessage('INVALID_EMAIL', {
        value: 'invalid-email',
        row: 3,
      });
      expect(error.type).toBe('validation');
      expect(error.suggestion).toContain('formato');
      expect(error.suggestion).toContain('@');
    });

    it('should generate INVALID_PHONE error', () => {
      const error = generateErrorMessage('INVALID_PHONE', {
        value: 'abc123',
        row: 7,
      });
      expect(error.type).toBe('validation');
      expect(error.suggestion).toContain('números');
    });

    it('should generate INVALID_CATEGORY error', () => {
      const error = generateErrorMessage('INVALID_CATEGORY', {
        value: 'InvalidCategory',
        row: 2,
      });
      expect(error.type).toBe('validation');
      expect(error.suggestion).toContain('Clínica');
      expect(error.suggestion).toContain('Bar');
      expect(error.suggestion).toContain('Restaurante');
      expect(error.suggestion).toContain('Empresa');
    });

    it('should generate DUPLICATE_PHONE error', () => {
      const error = generateErrorMessage('DUPLICATE_PHONE', {
        phone: '(11) 98765-4321',
        row: 10,
      });
      expect(error.type).toBe('duplicate');
      expect(error.suggestion).toContain('já foi importado');
    });

    it('should generate DUPLICATE_EMAIL error', () => {
      const error = generateErrorMessage('DUPLICATE_EMAIL', {
        email: 'test@example.com',
        row: 8,
      });
      expect(error.type).toBe('duplicate');
      expect(error.suggestion).toContain('já foi importado');
    });

    it('should generate EMPTY_FILE error', () => {
      const error = generateErrorMessage('EMPTY_FILE');
      expect(error.type).toBe('format');
      expect(error.suggestion).toContain('dados');
    });

    it('should generate MISSING_HEADER error', () => {
      const error = generateErrorMessage('MISSING_HEADER');
      expect(error.type).toBe('format');
      expect(error.suggestion).toContain('template');
    });

    it('should generate UNKNOWN_ERROR with custom message', () => {
      const error = generateErrorMessage('UNKNOWN_ERROR', {
        message: 'Custom error message',
      });
      expect(error.type).toBe('unknown');
      expect(error.message).toContain('Custom error message');
    });
  });

  describe('Error Message Content', () => {
    it('should have title, message and suggestion for all error types', () => {
      const errorTypes = [
        'INVALID_FORMAT',
        'MISSING_REQUIRED_FIELD',
        'INVALID_EMAIL',
        'INVALID_PHONE',
        'INVALID_CATEGORY',
        'DUPLICATE_PHONE',
        'DUPLICATE_EMAIL',
        'EMPTY_FILE',
        'MISSING_HEADER',
      ];

      errorTypes.forEach((errorType) => {
        const error = generateErrorMessage(errorType, { field: 'test', row: 1 });
        expect(error.title).toBeTruthy();
        expect(error.message).toBeTruthy();
        expect(error.suggestion).toBeTruthy();
        expect(error.type).toBeTruthy();
      });
    });

    it('should include actionable suggestions', () => {
      const error = generateErrorMessage('INVALID_PHONE', { value: 'abc', row: 5 });
      expect(error.suggestion).toMatch(/\d+/); // Should contain numbers or examples
    });

    it('should preserve row number in error details', () => {
      const error = generateErrorMessage('MISSING_REQUIRED_FIELD', {
        field: 'Telefone',
        row: 15,
      });
      expect(error.rowNumber).toBe(15);
    });

    it('should preserve field name in error details', () => {
      const error = generateErrorMessage('INVALID_EMAIL', {
        value: 'bad@',
        row: 3,
      });
      expect(error.field).toBe('email');
    });
  });

  describe('Error Type Classification', () => {
    it('should classify format errors correctly', () => {
      const formats = ['INVALID_FORMAT', 'EMPTY_FILE', 'MISSING_HEADER'];
      formats.forEach((type) => {
        const error = generateErrorMessage(type);
        expect(error.type).toBe('format');
      });
    });

    it('should classify validation errors correctly', () => {
      const validations = [
        'MISSING_REQUIRED_FIELD',
        'INVALID_EMAIL',
        'INVALID_PHONE',
        'INVALID_CATEGORY',
      ];
      validations.forEach((type) => {
        const error = generateErrorMessage(type, { field: 'test', row: 1 });
        expect(error.type).toBe('validation');
      });
    });

    it('should classify duplicate errors correctly', () => {
      const duplicates = ['DUPLICATE_PHONE', 'DUPLICATE_EMAIL'];
      duplicates.forEach((type) => {
        const error = generateErrorMessage(type, { phone: '123', row: 1 });
        expect(error.type).toBe('duplicate');
      });
    });
  });
});
