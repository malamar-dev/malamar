import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useCliHealth } from '@/features/settings/hooks/use-settings';

import { Alert, AlertDescription } from './ui/alert';

export function CliHealthBanner() {
  const { data: healthData = [], isLoading } = useCliHealth();

  // Don't show anything while loading or if we have healthy CLIs
  if (isLoading) return null;

  const healthyClis = healthData.filter((h) => h.is_healthy);

  // Only show banner if zero CLIs are healthy
  if (healthyClis.length > 0) return null;

  return (
    <Alert variant="destructive" className="rounded-none border-x-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>No CLIs available — configure in settings</span>
        <Link to="/settings" className="underline font-medium ml-2">
          Go to Settings
        </Link>
      </AlertDescription>
    </Alert>
  );
}
