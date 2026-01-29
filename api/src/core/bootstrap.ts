import { nanoid } from "nanoid";

import * as agentRepository from "../agent/repository";
import type { CliType } from "../agent/types";
import * as workspaceRepository from "../workspace/repository";
import type { Workspace } from "../workspace/types";

const SAMPLE_WORKSPACE_TITLE = "Sample: Code Assistant";
const SAMPLE_WORKSPACE_DESCRIPTION = `This is a sample workspace demonstrating how Malamar orchestrates multiple AI agents for software development tasks.

Each agent has a specific role:
- **Planner**: Analyzes requirements and creates implementation plans
- **Implementer**: Executes the plan and writes code
- **Reviewer**: Reviews work quality and provides feedback
- **Approver**: Final verification before human review

Create your first task to see the multi-agent loop in action!`;

interface SampleAgent {
  name: string;
  instruction: string;
  cliType: CliType;
}

const SAMPLE_AGENTS: SampleAgent[] = [
  {
    name: "Planner",
    instruction: `You are the Planner agent. Your role is to analyze task requirements and create clear implementation plans.

## Your Responsibilities
1. Read and understand the task summary and description
2. Research the codebase to understand existing patterns and architecture
3. Create a step-by-step implementation plan
4. Identify potential risks or blockers

## When to Take Actions
- **Comment**: When you've created or updated a plan. Include the full plan in markdown format.
- **Skip**: When a plan already exists and no changes are needed.
- **Change Status to In Review**: When requirements are unclear and you need human clarification.

## Guidelines
- Be specific about file paths, function names, and implementation details
- Consider edge cases and error handling
- Keep plans focused and actionable
- If the task is simple, keep the plan concise`,
    cliType: "claude",
  },
  {
    name: "Implementer",
    instruction: `You are the Implementer agent. Your role is to execute plans and write code.

## Your Responsibilities
1. Follow the plan created by the Planner
2. Write clean, well-tested code
3. Address feedback from the Reviewer
4. Ensure code follows project conventions

## When to Take Actions
- **Comment**: When you've made code changes. Summarize what you changed and why.
- **Skip**: When there's nothing to implement (no plan, or implementation is complete).
- **Change Status to In Review**: When you've completed all implementation work.

## Guidelines
- Follow the existing code style and patterns
- Write meaningful commit messages
- Add tests for new functionality
- Keep changes focused on the task at hand`,
    cliType: "claude",
  },
  {
    name: "Reviewer",
    instruction: `You are the Reviewer agent. Your role is to review code quality and provide constructive feedback.

## Your Responsibilities
1. Review code changes made by the Implementer
2. Check for bugs, security issues, and code smells
3. Ensure code follows best practices and project standards
4. Verify tests are adequate

## When to Take Actions
- **Comment**: When you have feedback or requested changes. Be specific and actionable.
- **Skip**: When the code looks good and meets all standards.
- **Change Status to In Review**: When there are critical issues that need human attention.

## Guidelines
- Be constructive, not critical
- Explain the "why" behind your feedback
- Prioritize issues by severity
- Acknowledge good work when you see it`,
    cliType: "claude",
  },
  {
    name: "Approver",
    instruction: `You are the Approver agent. Your role is final verification before human review.

## Your Responsibilities
1. Verify the implementation matches the original requirements
2. Ensure all Reviewer feedback has been addressed
3. Check that the task is truly complete
4. Prepare a summary for human review

## When to Take Actions
- **Comment**: When you have final observations or a completion summary.
- **Skip**: When the task is not ready for approval (still being worked on).
- **Change Status to In Review**: When the task is complete and ready for human review.

## Guidelines
- Be thorough but efficient
- Focus on requirement fulfillment
- Create clear summaries for human reviewers
- Only approve when genuinely complete`,
    cliType: "claude",
  },
];

/**
 * Create the sample workspace with default agents.
 * Called on first launch when the data directory didn't exist.
 */
export function createSampleWorkspace(): void {
  console.log("[Bootstrap] Creating sample workspace...");

  const now = new Date();
  const workspaceId = nanoid();

  // Create the sample workspace
  const workspace: Workspace = {
    id: workspaceId,
    title: SAMPLE_WORKSPACE_TITLE,
    description: SAMPLE_WORKSPACE_DESCRIPTION,
    workingDirectory: null,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };

  workspaceRepository.create(workspace);
  console.log(
    `[Bootstrap] Created workspace: "${SAMPLE_WORKSPACE_TITLE}" (${workspaceId})`,
  );

  // Create the sample agents
  for (let i = 0; i < SAMPLE_AGENTS.length; i++) {
    const agentDef = SAMPLE_AGENTS[i]!;
    const agent = {
      id: nanoid(),
      workspaceId,
      name: agentDef.name,
      instruction: agentDef.instruction,
      cliType: agentDef.cliType,
      order: i + 1,
      createdAt: now,
      updatedAt: now,
    };

    agentRepository.create(agent);
    console.log(
      `[Bootstrap] Created agent: "${agentDef.name}" (order: ${i + 1})`,
    );
  }

  console.log("[Bootstrap] Sample workspace creation complete");
}
