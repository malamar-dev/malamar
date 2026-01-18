import { config } from './config.ts';
import { doctor } from './doctor.ts';
import { help } from './help.ts';
import { serve } from './serve.ts';
import { version } from './version.ts';

/**
 * Available commands
 */
const COMMANDS = {
  serve,
  version,
  help,
  doctor,
  config,
} as const;

type CommandName = keyof typeof COMMANDS;

/**
 * Check if a string is a valid command name
 */
function isCommand(cmd: string): cmd is CommandName {
  return cmd in COMMANDS;
}

/**
 * Parse command from argv
 *
 * @param argv - Process argv (expects argv[2] to be the command)
 * @returns The command name or null if not found/not a command
 */
export function parseCommand(argv: string[]): CommandName | null {
  const arg = argv[2];

  if (!arg) {
    return null;
  }

  // Handle --help and -h flags
  if (arg === '--help' || arg === '-h') {
    return 'help';
  }

  // Handle --version and -v flags
  if (arg === '--version' || arg === '-v') {
    return 'version';
  }

  // Check if it's a known command
  if (isCommand(arg)) {
    return arg;
  }

  // Unknown argument - could be a flag for serve command
  return null;
}

/**
 * Run the command dispatcher
 *
 * Parses process.argv to determine which command to run:
 * - If no command specified, runs serve
 * - If --help or -h, runs help
 * - If --version or -v, runs version
 * - Otherwise runs the specified command
 */
export async function run(argv: string[] = process.argv): Promise<void> {
  const command = parseCommand(argv);

  // Default to serve if no command specified
  const cmd = command ?? 'serve';

  // Get the command handler
  const handler = COMMANDS[cmd];

  // Run the command
  await handler();
}

// Re-export individual commands
export { config } from './config.ts';
export type { CheckResult, DoctorResult } from './doctor.ts';
export { doctor, runDoctor } from './doctor.ts';
export { getHelpText, help } from './help.ts';
export { serve } from './serve.ts';
export { getVersion, version } from './version.ts';
