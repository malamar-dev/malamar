import { ChevronDown, ChevronUp, GripVertical, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { Agent } from '../types/agent.types';

interface AgentCardProps {
  agent: Agent;
  index: number;
  totalAgents: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const cliTypeLabels: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  codex: 'Codex',
  opencode: 'OpenCode',
};

export function AgentCard({
  agent,
  index,
  totalAgents,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: AgentCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        {/* Drag handle (desktop) */}
        <button
          className="hidden md:flex items-center justify-center p-1 -ml-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...dragHandleProps}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Order number */}
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium">
          {index + 1}
        </span>

        {/* Title */}
        <CardTitle className="text-base flex-1 truncate">{agent.name}</CardTitle>

        {/* CLI type badge */}
        <Badge variant="secondary">{cliTypeLabels[agent.cli_type] || agent.cli_type}</Badge>
      </CardHeader>

      <CardContent>
        {/* Instruction preview */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {agent.instruction || 'No instruction set'}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {/* Mobile reorder buttons */}
          <div className="flex gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveUp}
              disabled={index === 0}
              className="h-8 w-8"
            >
              <ChevronUp className="h-4 w-4" />
              <span className="sr-only">Move up</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={index === totalAgents - 1}
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">Move down</span>
            </Button>
          </div>

          {/* Edit/Delete buttons */}
          <div className="flex gap-1 ml-auto">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
