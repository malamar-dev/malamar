import { describe, expect, test } from 'bun:test';

import { getHelpText } from './help.ts';

describe('help command', () => {
  describe('getHelpText', () => {
    test('should return help text', () => {
      const helpText = getHelpText();
      expect(helpText).toBeDefined();
      expect(typeof helpText).toBe('string');
    });

    test('should include version', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('malamar v');
    });

    test('should include usage information', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('Usage:');
    });

    test('should include commands section', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('Commands:');
      expect(helpText).toContain('serve');
      expect(helpText).toContain('version');
      expect(helpText).toContain('help');
      expect(helpText).toContain('doctor');
      expect(helpText).toContain('config');
    });

    test('should include options section', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('Options:');
      expect(helpText).toContain('--host');
      expect(helpText).toContain('--port');
      expect(helpText).toContain('--data-dir');
      expect(helpText).toContain('--log-level');
      expect(helpText).toContain('--log-format');
    });

    test('should include environment variables section', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('Environment Variables:');
      expect(helpText).toContain('MALAMAR_HOST');
      expect(helpText).toContain('MALAMAR_PORT');
      expect(helpText).toContain('MALAMAR_DATA_DIR');
    });

    test('should include examples section', () => {
      const helpText = getHelpText();
      expect(helpText).toContain('Examples:');
    });
  });

  describe('module exports', () => {
    test('should export help function', async () => {
      const module = await import('./help.ts');
      expect(module.help).toBeDefined();
      expect(typeof module.help).toBe('function');
    });

    test('should export getHelpText function', async () => {
      const module = await import('./help.ts');
      expect(module.getHelpText).toBeDefined();
      expect(typeof module.getHelpText).toBe('function');
    });
  });
});
