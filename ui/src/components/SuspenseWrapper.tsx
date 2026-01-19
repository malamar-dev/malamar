import { Suspense } from 'react';

import { LoadingSpinner } from '@/components/LoadingSpinner';

export function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <LoadingSpinner />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
