import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { CliType } from '../types/agent.types';
import { InstructionEditorModal } from './InstructionEditorModal';

const agentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  cli_type: z.enum(['claude', 'gemini', 'codex', 'opencode']),
  instruction: z.string(),
});

export type AgentFormValues = z.infer<typeof agentSchema>;

interface AgentFormProps {
  onSubmit: (values: AgentFormValues) => void;
  onCancel: () => void;
  defaultValues?: Partial<AgentFormValues>;
  isLoading?: boolean;
}

const cliOptions: { value: CliType; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'codex', label: 'Codex' },
  { value: 'opencode', label: 'OpenCode' },
];

export function AgentForm({ onSubmit, onCancel, defaultValues, isLoading }: AgentFormProps) {
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      cli_type: defaultValues?.cli_type ?? 'claude',
      instruction: defaultValues?.instruction ?? '',
    },
  });

  const instruction = form.watch('instruction');

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Agent" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cli_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CLI Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CLI" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cliOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instruction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instruction</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    {instruction ? (
                      <span className="line-clamp-2">{instruction}</span>
                    ) : (
                      <span className="italic">No instruction set</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsInstructionModalOpen(true)}
                    disabled={isLoading}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <InstructionEditorModal
                  value={field.value}
                  onChange={field.onChange}
                  open={isInstructionModalOpen}
                  onOpenChange={setIsInstructionModalOpen}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
