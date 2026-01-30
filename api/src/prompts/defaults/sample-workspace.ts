import type { CreateWorkspaceInput } from "../../workspace/types";

export const SAMPLE_WORKSPACE_TITLE = "Sample: Code Assistant";

export const SAMPLE_WORKSPACE: CreateWorkspaceInput = {
  title: SAMPLE_WORKSPACE_TITLE,
  description: `You are part of a code assistant workflow. This workspace demonstrates how multiple agents collaborate to plan, implement, review, and approve code changes.

Each agent has a specific role:
- Planner: Analyzes requirements and creates implementation plans
- Implementer: Executes the plan and writes code
- Reviewer: Reviews code quality and provides feedback
- Approver: Verifies the work meets requirements

Communicate with other agents through comments. Reference agents by name when your feedback is directed at them (e.g., "Implementer, please also add error handling for...").

Since this workspace uses Temp Folder mode, each task starts with a clean directory. Include repository URLs or file contents in the task description so agents know what to work with.`,
  workingDirectory: null, // Temp Folder mode
};
