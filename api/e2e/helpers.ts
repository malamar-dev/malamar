import { app } from "../src/app";

const server = Bun.serve({
  port: 0, // Random available port
  fetch: app.fetch,
});

const port = server.port;

process.on("exit", () => {
  server.stop();
});

process.on("SIGINT", () => {
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});

export function getBaseUrl(): string {
  return `http://127.0.0.1:${port}`;
}
