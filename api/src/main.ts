#!/usr/bin/env bun

const args = process.argv.slice(2);
const command = args[0] ?? "serve";

switch (command) {
  case "version":
  case "-v":
  case "--version":
    await showVersion();
    break;
  case "help":
  case "-h":
  case "--help":
    printHelp();
    break;
  case "serve":
  default:
    await startServer();
    break;
}

async function showVersion() {
  const packageJson = await Bun.file(
    new URL("../package.json", import.meta.url),
  ).json();
  console.log(`malamar v${packageJson.version}`);
}

function printHelp() {
  console.log(`
Malamar - Multi-agent workflow orchestration for AI CLIs

Usage: malamar [command]

Commands:
  serve     Start the server (default)
  version   Show version info
  help      Show this help message

Environment Variables:
  MALAMAR_HOST                  Bind address (default: 127.0.0.1)
  MALAMAR_PORT                  Server port (default: 3456)
  MALAMAR_DATA_DIR              Data directory (default: ~/.malamar)
  MALAMAR_LOG_LEVEL             Log verbosity (default: info)
  MALAMAR_RUNNER_POLL_INTERVAL  Task runner poll interval in ms (default: 1000)

Examples:
  malamar                       Start server on default port
  MALAMAR_PORT=8080 malamar     Start server on port 8080
  malamar version               Show version
`);
}

async function startServer() {
  // Import the server configuration and start it
  const serverConfig = await import("./index.ts");
  Bun.serve(serverConfig.default);
}
