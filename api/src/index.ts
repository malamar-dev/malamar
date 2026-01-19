import { app } from "./app";
import { loadConfig } from "./core";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs";

const config = loadConfig();

startBackgroundJobs();

function shutdown() {
  console.log("Shutting down...");
  stopBackgroundJobs();
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
