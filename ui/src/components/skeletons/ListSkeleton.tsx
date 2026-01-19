import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  className?: string;
  items?: number;
  hasAvatar?: boolean;
}

export function ListSkeleton({ className, items = 3, hasAvatar = false }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          {hasAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
