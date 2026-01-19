import { useIsFetching } from '@tanstack/react-query';

import { LoadingSpinner } from '@/components/LoadingSpinner';

export function GlobalSpinner() {
  const isFetching = useIsFetching();

  if (!isFetching) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 p-2 rounded-full bg-background/80 border shadow-sm backdrop-blur-sm">
      <LoadingSpinner size="sm" />
    </div>
  );
}
