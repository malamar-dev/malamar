import { app } from "./app";
import { closeDatabase, initDatabase, loadConfig } from "./core";
import { closeSSEConnections } from "./events";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs";
import { resetInProgressQueueItems } from "./task/repository";

const config = loadConfig();

await initDatabase();

// Startup recovery: reset any in_progress queue items to queued
// This handles crash recovery where processing was interrupted
resetInProgressQueueItems();

startBackgroundJobs();

function shutdown() {
  console.log("Shutting down...");
  stopBackgroundJobs();
  closeSSEConnections();
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
