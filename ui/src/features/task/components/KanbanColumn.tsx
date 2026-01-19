import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Task, TaskStatus } from '../types/task.types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-slate-500',
  in_progress: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  done: 'bg-green-500',
};

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-lg flex-shrink-0">
      {/* Column header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
          <h3 className="font-medium text-sm">{statusLabels[status]}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
