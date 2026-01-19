import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/date-utils';

interface TimeAgoProps {
  date: string;
  className?: string;
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <time dateTime={date} className={className}>
            {formatRelativeTime(date)}
          </time>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formatAbsoluteTime(date)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
