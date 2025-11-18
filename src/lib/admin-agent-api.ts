import { apiClient } from './api-client'
import type { UnassignedAgent } from '@/types/admin-agent'

export const adminAgentApi = {
  async getUnassignedAgents(token: string) {
    return apiClient.get<UnassignedAgent[]>('/auth/admin/agents/unassigned', token)
  },
}

