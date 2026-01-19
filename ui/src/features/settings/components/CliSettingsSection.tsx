import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { PasswordInput } from '@/components/PasswordInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CliType } from '@/features/agent/types/agent.types';

import { useCliHealth, useRefreshCliHealth } from '../hooks/use-settings';
import type { CliSettings } from '../types/settings.types';

interface CliSettingsSectionProps {
  settings: Record<CliType, CliSettings>;
  onChange: (settings: Record<CliType, CliSettings>) => void;
}

const cliTypes: { type: CliType; name: string }[] = [
  { type: 'claude', name: 'Claude' },
  { type: 'gemini', name: 'Gemini' },
  { type: 'codex', name: 'Codex' },
  { type: 'opencode', name: 'OpenCode' },
];

export function CliSettingsSection({ settings, onChange }: CliSettingsSectionProps) {
  const { data: healthData = [] } = useCliHealth();
  const refreshHealth = useRefreshCliHealth();

  const getHealth = (type: CliType) => healthData.find((h) => h.cli_type === type);

  const handleRefresh = async () => {
    try {
      await refreshHealth.mutateAsync();
      toast.success('CLI health refreshed');
    } catch {
      toast.error('Failed to refresh CLI health');
    }
  };

  const updateCliSettings = (type: CliType, update: Partial<CliSettings>) => {
    onChange({
      ...settings,
      [type]: {
        ...settings[type],
        ...update,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>CLI Configuration</CardTitle>
            <CardDescription>Configure CLI binaries and environment variables</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshHealth.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshHealth.isPending ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {cliTypes.map(({ type, name }) => {
          const health = getHealth(type);
          const cliSettings = settings[type] || { env_vars: {} };

          return (
            <CliTypeSettings
              key={type}
              name={name}
              type={type}
              settings={cliSettings}
              health={health}
              onChange={(update) => updateCliSettings(type, update)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

interface CliTypeSettingsProps {
  name: string;
  type: CliType;
  settings: CliSettings;
  health?: { is_healthy: boolean; error?: string };
  onChange: (update: Partial<CliSettings>) => void;
}

function CliTypeSettings({ name, settings, health, onChange }: CliTypeSettingsProps) {
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const addEnvVar = () => {
    if (!newEnvKey.trim()) return;
    onChange({
      env_vars: {
        ...settings.env_vars,
        [newEnvKey.trim()]: newEnvValue,
      },
    });
    setNewEnvKey('');
    setNewEnvValue('');
  };

  const removeEnvVar = (key: string) => {
    const newEnvVars = { ...settings.env_vars };
    delete newEnvVars[key];
    onChange({ env_vars: newEnvVars });
  };

  const updateEnvVar = (key: string, value: string) => {
    onChange({
      env_vars: {
        ...settings.env_vars,
        [key]: value,
      },
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{name}</h4>
        <Badge variant={health?.is_healthy ? 'default' : 'destructive'}>
          {health?.is_healthy ? 'Healthy' : 'Unavailable'}
        </Badge>
      </div>

      {health?.error && (
        <p className="text-sm text-destructive">{health.error}</p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${name}-path`}>Binary Path (optional)</Label>
        <Input
          id={`${name}-path`}
          value={settings.binary_path || ''}
          onChange={(e) => onChange({ binary_path: e.target.value || undefined })}
          placeholder="Leave empty to use system PATH"
        />
      </div>

      <div className="space-y-2">
        <Label>Environment Variables</Label>
        <div className="space-y-2">
          {Object.entries(settings.env_vars).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <Input value={key} disabled className="w-1/3" />
              <PasswordInput
                value={value}
                onChange={(e) => updateEnvVar(key, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeEnvVar(key)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value)}
              placeholder="KEY"
              className="w-1/3"
            />
            <PasswordInput
              value={newEnvValue}
              onChange={(e) => setNewEnvValue(e.target.value)}
              placeholder="value"
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={addEnvVar}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
