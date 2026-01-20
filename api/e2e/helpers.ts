import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Set test data directory before importing app (which imports database)
const TEST_DATA_DIR = join(tmpdir(), `malamar_test_${process.pid}`);
process.env.MALAMAR_DATA_DIR = TEST_DATA_DIR;

import { app } from "../src/app";
import { closeDatabase, initDatabase } from "../src/core";

// Initialize database before starting server
await initDatabase();

const server = Bun.serve({
  port: 0, // Random available port
  fetch: app.fetch,
});

const port = server.port;

async function cleanup() {
  void server.stop();
  closeDatabase();
  await rm(TEST_DATA_DIR, { recursive: true, force: true }).catch(() => {});
}

process.on("exit", () => {
  server.stop();
});

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

export function getBaseUrl(): string {
  return `http://127.0.0.1:${port}`;
}

export function getTestDataDir(): string {
  return TEST_DATA_DIR;
}
