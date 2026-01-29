import { getDatabase } from "../core";
import type { Agent, AgentRow, CliType } from "./types";

/**
 * Convert a database row to an Agent entity.
 */
function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    instruction: row.instruction,
    cliType: row.cli_type as CliType,
    order: row.order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Find all agents for a workspace, ordered by `order`.
 */
export function findByWorkspaceId(workspaceId: string): Agent[] {
  const db = getDatabase();
  const rows = db
    .query<
      AgentRow,
      [string]
    >(`SELECT * FROM agents WHERE workspace_id = ? ORDER BY "order" ASC`)
    .all(workspaceId);
  return rows.map(rowToAgent);
}

/**
 * Find an agent by ID.
 * Returns null if not found.
 */
export function findById(id: string): Agent | null {
  const db = getDatabase();
  const row = db
    .query<AgentRow, [string]>(`SELECT * FROM agents WHERE id = ?`)
    .get(id);
  return row ? rowToAgent(row) : null;
}

/**
 * Check if an agent name already exists in a workspace.
 * Optionally excludes a specific agent ID (for updates).
 */
export function existsByNameInWorkspace(
  workspaceId: string,
  name: string,
  excludeAgentId?: string,
): boolean {
  const db = getDatabase();
  if (excludeAgentId) {
    const result = db
      .query<
        { count: number },
        [string, string, string]
      >(`SELECT COUNT(*) as count FROM agents WHERE workspace_id = ? AND name = ? AND id != ?`)
      .get(workspaceId, name, excludeAgentId);
    return (result?.count ?? 0) > 0;
  } else {
    const result = db
      .query<
        { count: number },
        [string, string]
      >(`SELECT COUNT(*) as count FROM agents WHERE workspace_id = ? AND name = ?`)
      .get(workspaceId, name);
    return (result?.count ?? 0) > 0;
  }
}

/**
 * Get the maximum order value for agents in a workspace.
 * Returns 0 if no agents exist.
 */
export function getMaxOrder(workspaceId: string): number {
  const db = getDatabase();
  const result = db
    .query<
      { max_order: number | null },
      [string]
    >(`SELECT MAX("order") as max_order FROM agents WHERE workspace_id = ?`)
    .get(workspaceId);
  return result?.max_order ?? 0;
}

/**
 * Create a new agent in the database.
 */
export function create(agent: Agent): Agent {
  const db = getDatabase();
  db.prepare(
    `
    INSERT INTO agents (id, workspace_id, name, instruction, cli_type, "order", created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    agent.id,
    agent.workspaceId,
    agent.name,
    agent.instruction,
    agent.cliType,
    agent.order,
    agent.createdAt.toISOString(),
    agent.updatedAt.toISOString(),
  );
  return agent;
}

/**
 * Update an existing agent.
 */
export function update(
  id: string,
  data: { name?: string; instruction?: string; cliType?: CliType },
): Agent | null {
  const db = getDatabase();
  const agent = findById(id);
  if (!agent) {
    return null;
  }

  const updatedAgent: Agent = {
    ...agent,
    name: data.name ?? agent.name,
    instruction: data.instruction ?? agent.instruction,
    cliType: data.cliType ?? agent.cliType,
    updatedAt: new Date(),
  };

  db.prepare(
    `
    UPDATE agents
    SET name = ?, instruction = ?, cli_type = ?, updated_at = ?
    WHERE id = ?
  `,
  ).run(
    updatedAgent.name,
    updatedAgent.instruction,
    updatedAgent.cliType,
    updatedAgent.updatedAt.toISOString(),
    id,
  );

  return updatedAgent;
}

/**
 * Delete an agent by ID.
 * Returns true if deleted, false if not found.
 */
export function deleteById(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM agents WHERE id = ?`).run(id);
  return result.changes > 0;
}

/**
 * Reorder agents in a workspace.
 * Updates the order of each agent based on its position in the agentIds array.
 * Wrapped in a transaction for atomicity.
 */
export function reorder(workspaceId: string, agentIds: string[]): Agent[] {
  const db = getDatabase();

  const updateStmt = db.prepare(
    `UPDATE agents SET "order" = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
  );
  const now = new Date().toISOString();

  // Wrap all updates in a transaction for atomicity
  db.transaction(() => {
    for (let i = 0; i < agentIds.length; i++) {
      updateStmt.run(i + 1, now, agentIds[i]!, workspaceId);
    }
  })();

  return findByWorkspaceId(workspaceId);
}

/**
 * Check if all agent IDs belong to a workspace.
 */
export function validateAgentIds(
  workspaceId: string,
  agentIds: string[],
): boolean {
  const db = getDatabase();
  const placeholders = agentIds.map(() => "?").join(",");
  const result = db
    .query<
      { count: number },
      [string, ...string[]]
    >(`SELECT COUNT(*) as count FROM agents WHERE workspace_id = ? AND id IN (${placeholders})`)
    .get(workspaceId, ...agentIds);
  return result?.count === agentIds.length;
}
