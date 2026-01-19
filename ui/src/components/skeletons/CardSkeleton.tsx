import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
  hasHeader?: boolean;
  headerLines?: number;
  contentLines?: number;
}

export function CardSkeleton({
  className,
  hasHeader = true,
  headerLines = 1,
  contentLines = 2,
}: CardSkeletonProps) {
  return (
    <Card className={cn(className)}>
      {hasHeader && (
        <CardHeader className="space-y-2">
          {Array.from({ length: headerLines }).map((_, i) => (
            <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-3/4' : 'w-1/2')} />
          ))}
        </CardHeader>
      )}
      <CardContent className="space-y-2">
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton key={i} className={cn('h-4', i === contentLines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </CardContent>
    </Card>
  );
}
