import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { getMigrationFiles, resetDb } from './database.ts';

describe('transaction', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)');
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  test('commits on success', () => {
    db.transaction(() => {
      db.query('INSERT INTO test (value) VALUES (?)').run('hello');
      db.query('INSERT INTO test (value) VALUES (?)').run('world');
    })();

    const rows = db.query('SELECT value FROM test ORDER BY id').all();
    expect(rows).toHaveLength(2);
  });

  test('rolls back on error', () => {
    try {
      db.transaction(() => {
        db.query('INSERT INTO test (value) VALUES (?)').run('hello');
        throw new Error('Simulated error');
      })();
    } catch {
      // Expected
    }

    const rows = db.query('SELECT value FROM test').all();
    expect(rows).toHaveLength(0);
  });

  test('returns value from function', () => {
    const result = db.transaction(() => {
      db.query('INSERT INTO test (value) VALUES (?)').run('hello');
      return 42;
    })();

    expect(result).toBe(42);
  });
});

describe('getMigrationFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `malamar-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns empty array for non-existent directory', () => {
    const files = getMigrationFiles('/non/existent/path');
    expect(files).toEqual([]);
  });

  test('returns empty array for directory with no SQL files', () => {
    writeFileSync(join(tempDir, 'readme.txt'), 'hello');
    const files = getMigrationFiles(tempDir);
    expect(files).toEqual([]);
  });

  test('parses version from filename prefix', () => {
    writeFileSync(join(tempDir, '001_initial.sql'), 'SELECT 1');
    writeFileSync(join(tempDir, '002_users.sql'), 'SELECT 2');
    writeFileSync(join(tempDir, '010_cleanup.sql'), 'SELECT 3');

    const files = getMigrationFiles(tempDir);
    expect(files).toHaveLength(3);
    expect(files[0]?.version).toBe(1);
    expect(files[1]?.version).toBe(2);
    expect(files[2]?.version).toBe(10);
  });

  test('sorts migrations by version', () => {
    writeFileSync(join(tempDir, '003_third.sql'), 'SELECT 3');
    writeFileSync(join(tempDir, '001_first.sql'), 'SELECT 1');
    writeFileSync(join(tempDir, '002_second.sql'), 'SELECT 2');

    const files = getMigrationFiles(tempDir);
    expect(files.map((f) => f.version)).toEqual([1, 2, 3]);
  });

  test('ignores files without version prefix', () => {
    writeFileSync(join(tempDir, '001_valid.sql'), 'SELECT 1');
    writeFileSync(join(tempDir, 'invalid.sql'), 'SELECT 2');

    const files = getMigrationFiles(tempDir);
    expect(files).toHaveLength(1);
    expect(files[0]?.version).toBe(1);
  });

  test('ignores non-SQL files', () => {
    writeFileSync(join(tempDir, '001_valid.sql'), 'SELECT 1');
    writeFileSync(join(tempDir, '002_readme.md'), '# Hello');

    const files = getMigrationFiles(tempDir);
    expect(files).toHaveLength(1);
  });
});
