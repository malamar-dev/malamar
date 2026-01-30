import type { CreateAgentInput } from "../../../agent/types";
import { APPROVER_AGENT } from "./approver";
import { IMPLEMENTER_AGENT } from "./implementer";
import { PLANNER_AGENT } from "./planner";
import { REVIEWER_AGENT } from "./reviewer";

/**
 * Default agents created for every new workspace.
 * Ordered by execution sequence in the multi-agent loop.
 */
export const DEFAULT_AGENTS: CreateAgentInput[] = [
  PLANNER_AGENT,
  IMPLEMENTER_AGENT,
  REVIEWER_AGENT,
  APPROVER_AGENT,
];

export { APPROVER_AGENT, IMPLEMENTER_AGENT, PLANNER_AGENT, REVIEWER_AGENT };
