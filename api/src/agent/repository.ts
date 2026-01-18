import type { Database } from 'bun:sqlite';

import { getDb } from '../core/database.ts';
import { generateId, now } from '../shared/index.ts';
import type { Agent, AgentRow, CreateAgentInput, UpdateAgentInput } from './types.ts';
import { rowToAgent } from './types.ts';

export function findByWorkspaceId(workspaceId: string, db: Database = getDb()): Agent[] {
  const rows = db
    .query<AgentRow, [string]>('SELECT * FROM agents WHERE workspace_id = ? ORDER BY "order" ASC')
    .all(workspaceId);
  return rows.map(rowToAgent);
}

export function findById(id: string, db: Database = getDb()): Agent | null {
  const row = db.query<AgentRow, [string]>('SELECT * FROM agents WHERE id = ?').get(id);
  return row ? rowToAgent(row) : null;
}

export function findByName(
  workspaceId: string,
  name: string,
  db: Database = getDb()
): Agent | null {
  const row = db
    .query<AgentRow, [string, string]>('SELECT * FROM agents WHERE workspace_id = ? AND name = ?')
    .get(workspaceId, name);
  return row ? rowToAgent(row) : null;
}

export function getNextOrder(workspaceId: string, db: Database = getDb()): number {
  const result = db
    .query<
      { max_order: number | null },
      [string]
    >('SELECT MAX("order") as max_order FROM agents WHERE workspace_id = ?')
    .get(workspaceId);
  return (result?.max_order ?? 0) + 1;
}

export function create(input: CreateAgentInput, db: Database = getDb()): Agent {
  const id = generateId();
  const timestamp = now();
  const order = input.order ?? getNextOrder(input.workspaceId, db);

  const row: AgentRow = {
    id,
    workspace_id: input.workspaceId,
    name: input.name,
    instruction: input.instruction,
    cli_type: input.cliType,
    order,
    created_at: timestamp,
    updated_at: timestamp,
  };

  db.query(
    `INSERT INTO agents (id, workspace_id, name, instruction, cli_type, "order", created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.workspace_id,
    row.name,
    row.instruction,
    row.cli_type,
    row.order,
    row.created_at,
    row.updated_at
  );

  return rowToAgent(row);
}

export function update(id: string, input: UpdateAgentInput, db: Database = getDb()): Agent | null {
  const existing = findById(id, db);
  if (!existing) {
    return null;
  }

  const timestamp = now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [timestamp];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.instruction !== undefined) {
    updates.push('instruction = ?');
    values.push(input.instruction);
  }
  if (input.cliType !== undefined) {
    updates.push('cli_type = ?');
    values.push(input.cliType);
  }

  values.push(id);
  db.query(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return findById(id, db);
}

export function remove(id: string, db: Database = getDb()): boolean {
  const result = db.query('DELETE FROM agents WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorder(workspaceId: string, agentIds: string[], db: Database = getDb()): void {
  const timestamp = now();

  db.transaction(() => {
    // First, set all orders to negative values to avoid unique constraint violations
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      db.query(
        'UPDATE agents SET "order" = ?, updated_at = ? WHERE id = ? AND workspace_id = ?'
      ).run(-(i + 1), timestamp, agentId, workspaceId);
    }

    // Then, set the correct positive order values
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      db.query('UPDATE agents SET "order" = ? WHERE id = ? AND workspace_id = ?').run(
        i + 1,
        agentId,
        workspaceId
      );
    }
  })();
}
