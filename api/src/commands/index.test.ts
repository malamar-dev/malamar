import { describe, expect, test } from 'bun:test';

import { parseCommand } from './index.ts';

describe('command dispatcher', () => {
  describe('parseCommand', () => {
    test('should return null for empty argv', () => {
      const result = parseCommand(['node', 'index.ts']);
      expect(result).toBeNull();
    });

    test('should return serve for serve command', () => {
      const result = parseCommand(['node', 'index.ts', 'serve']);
      expect(result).toBe('serve');
    });

    test('should return version for version command', () => {
      const result = parseCommand(['node', 'index.ts', 'version']);
      expect(result).toBe('version');
    });

    test('should return help for help command', () => {
      const result = parseCommand(['node', 'index.ts', 'help']);
      expect(result).toBe('help');
    });

    test('should return doctor for doctor command', () => {
      const result = parseCommand(['node', 'index.ts', 'doctor']);
      expect(result).toBe('doctor');
    });

    test('should return config for config command', () => {
      const result = parseCommand(['node', 'index.ts', 'config']);
      expect(result).toBe('config');
    });

    test('should return help for --help flag', () => {
      const result = parseCommand(['node', 'index.ts', '--help']);
      expect(result).toBe('help');
    });

    test('should return help for -h flag', () => {
      const result = parseCommand(['node', 'index.ts', '-h']);
      expect(result).toBe('help');
    });

    test('should return version for --version flag', () => {
      const result = parseCommand(['node', 'index.ts', '--version']);
      expect(result).toBe('version');
    });

    test('should return version for -v flag', () => {
      const result = parseCommand(['node', 'index.ts', '-v']);
      expect(result).toBe('version');
    });

    test('should return null for unknown command', () => {
      const result = parseCommand(['node', 'index.ts', 'unknown']);
      expect(result).toBeNull();
    });

    test('should return null for flags that are not commands', () => {
      const result = parseCommand(['node', 'index.ts', '--port']);
      expect(result).toBeNull();
    });
  });

  describe('module exports', () => {
    test('should export run function', async () => {
      const module = await import('./index.ts');
      expect(module.run).toBeDefined();
      expect(typeof module.run).toBe('function');
    });

    test('should export parseCommand function', async () => {
      const module = await import('./index.ts');
      expect(module.parseCommand).toBeDefined();
      expect(typeof module.parseCommand).toBe('function');
    });

    test('should export individual command functions', async () => {
      const module = await import('./index.ts');
      expect(module.serve).toBeDefined();
      expect(module.version).toBeDefined();
      expect(module.help).toBeDefined();
      expect(module.doctor).toBeDefined();
      expect(module.config).toBeDefined();
    });

    test('should export helper functions', async () => {
      const module = await import('./index.ts');
      expect(module.getVersion).toBeDefined();
      expect(module.getHelpText).toBeDefined();
      expect(module.runDoctor).toBeDefined();
    });
  });
});
