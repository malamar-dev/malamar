import { describe, expect, test } from 'bun:test';

import { generateId, ID_LENGTH, MOCK_USER_ID } from './nanoid.ts';

describe('generateId', () => {
  test('generates a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  test('generates ID of correct length', () => {
    const id = generateId();
    expect(id.length).toBe(ID_LENGTH);
  });

  test('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  test('uses URL-safe characters only', () => {
    const urlSafePattern = /^[A-Za-z0-9_-]+$/;
    for (let i = 0; i < 100; i++) {
      const id = generateId();
      expect(id).toMatch(urlSafePattern);
    }
  });
});

describe('MOCK_USER_ID', () => {
  test('has correct length', () => {
    expect(MOCK_USER_ID.length).toBe(ID_LENGTH);
  });

  test('is all zeros', () => {
    expect(MOCK_USER_ID).toBe('000000000000000000000');
  });
});
