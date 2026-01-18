import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Get the version from package.json
 *
 * @returns The version string or 'unknown' if unable to read
 */
export function getVersion(): string {
  try {
    const packageJsonPath = join(import.meta.dir, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Version command - prints the version from package.json
 *
 * Exits with code 0.
 */
export function version(): void {
  const ver = getVersion();
  console.log(`malamar v${ver}`);
  process.exit(0);
}
