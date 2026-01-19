import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ApiException } from '@/types/api.types';

interface ErrorMessageProps {
  error: Error | ApiException | null;
  title?: string;
}

export function ErrorMessage({ error, title = 'Error' }: ErrorMessageProps) {
  if (!error) {
    return null;
  }

  const message = error instanceof ApiException ? error.message : error.message || 'An unexpected error occurred';

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
