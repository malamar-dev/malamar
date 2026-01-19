import { app } from "./app";
import { loadConfig } from "./core";

const config = loadConfig();

console.log(`Starting server at http://${config.host}:${config.port}`);

export default {
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
};
