import { getVersion } from './version.ts';

/**
 * Help text for the Malamar CLI
 */
const HELP_TEXT = `
Usage: malamar [command] [options]

Commands:
  serve           Start the Malamar server (default command)
  version         Print version information
  help            Show this help message
  doctor          Check system health and configuration
  config          Show current configuration

Options:
  --host <host>               Server host (default: 127.0.0.1)
  --port <port>               Server port (default: 3456)
  --data-dir <path>           Data directory (default: ~/.malamar)
  --log-level <level>         Log level: debug, info, warn, error (default: info)
  --log-format <format>       Log format: text, json (default: text)
  --runner-poll-interval <ms> Runner poll interval in ms (default: 1000)
  --temp-dir <path>           Temporary directory (default: system temp)

  -h, --help                  Show this help message
  -v, --version               Print version information

Environment Variables:
  MALAMAR_HOST                Server host
  MALAMAR_PORT                Server port
  MALAMAR_DATA_DIR            Data directory
  MALAMAR_LOG_LEVEL           Log level
  MALAMAR_LOG_FORMAT          Log format
  MALAMAR_RUNNER_POLL_INTERVAL  Runner poll interval
  MALAMAR_TEMP_DIR            Temporary directory

Examples:
  malamar                     Start server with default settings
  malamar serve --port 8080   Start server on port 8080
  malamar doctor              Check system health
  malamar config              Show current configuration
`;

/**
 * Get formatted help text
 *
 * @returns The help text string
 */
export function getHelpText(): string {
  const version = getVersion();
  return `malamar v${version}${HELP_TEXT}`;
}

/**
 * Help command - prints usage information
 *
 * Exits with code 0.
 */
export function help(): void {
  console.log(getHelpText());
  process.exit(0);
}
