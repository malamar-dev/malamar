import { app } from "./app";
import { closeDatabase, initDatabase, loadConfig } from "./core";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs";

const config = loadConfig();

await initDatabase();

startBackgroundJobs();

function shutdown() {
  console.log("Shutting down...");
  stopBackgroundJobs();
  closeDatabase();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`Starting server at http://${config.host}:${config.port}`);

export default {
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
};
