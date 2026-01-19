import { Activity, AlertCircle, CheckCircle, Play, RefreshCw } from 'lucide-react';

import { TimeAgo } from '@/components/TimeAgo';
import { cn } from '@/lib/utils';

import type { TaskLog } from '../types/task.types';

interface ActivityLogProps {
  logs: TaskLog[];
}

const eventIcons: Record<string, React.ElementType> = {
  created: CheckCircle,
  status_changed: RefreshCw,
  error: AlertCircle,
  agent_started: Play,
  agent_finished: CheckCircle,
};

export function ActivityLog({ logs }: ActivityLogProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, index) => {
        const Icon = eventIcons[log.event_type] || Activity;
        const isLast = index === logs.length - 1;

        return (
          <div key={log.id} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className="p-1.5 rounded-full bg-muted">
                <Icon className={cn(
                  'h-3 w-3',
                  log.event_type === 'error' && 'text-destructive'
                )} />
              </div>
              {!isLast && <div className="w-px h-full bg-border min-h-[24px]" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="text-sm">{log.description}</p>
              <TimeAgo date={log.created_at} className="text-xs text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
