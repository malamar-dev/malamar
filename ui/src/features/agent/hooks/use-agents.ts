import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { agentApi } from '../api/agent.api';
import type { CreateAgentInput, UpdateAgentInput } from '../types/agent.types';

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...agentKeys.lists(), workspaceId] as const,
};

export function useAgents(workspaceId: string) {
  return useQuery({
    queryKey: agentKeys.list(workspaceId),
    queryFn: () => agentApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateAgent(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgentInput) => agentApi.create(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId) });
    },
  });
}

export function useUpdateAgent(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) => agentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId) });
    },
  });
}

export function useDeleteAgent(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId) });
    },
  });
}

export function useReorderAgents(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentIds: string[]) => agentApi.reorder(workspaceId, agentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list(workspaceId) });
    },
  });
}
