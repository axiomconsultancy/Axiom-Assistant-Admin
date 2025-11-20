import { apiClient } from './api-client'
import type {
  UnassignedAgent,
  AdminAgent,
  CreateAgentPayload,
  AdminAgentListResponse,
  AdminAgentQueryParams
} from '@/types/admin-agent'

type UpdateAgentPayload = Partial<CreateAgentPayload> & Record<string, any>

export const adminAgentApi = {
  async getUnassignedAgents(token: string) {
    return apiClient.get<UnassignedAgent[]>('/auth/admin/agents/unassigned', token)
  },
  async getAgent(token: string, agentId: string) {
    return apiClient.get<AdminAgent>(`/auth/admin/agents/${agentId}`, token)
  },
  async getAllAgents(token: string, params: AdminAgentQueryParams = {}) {
    const queryParams = new URLSearchParams()

    if (params.skip !== undefined) {
      queryParams.append('skip', params.skip.toString())
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString())
    }
    if (params.search) {
      queryParams.append('search', params.search)
    }
    if (params.assignment) {
      queryParams.append('assignment', params.assignment)
    }

    const endpoint = `/auth/admin/agents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<AdminAgentListResponse | AdminAgent[]>(endpoint, token)
  },
  async createAgent(token: string, payload: CreateAgentPayload) {
    return apiClient.post<AdminAgent>('/auth/admin/agents', payload, token)
  },
  async updateAgent(token: string, agentId: string, payload: UpdateAgentPayload) {
    return apiClient.patch<AdminAgent>(`/auth/admin/agents/${agentId}`, payload, token)
  },
  async deleteAgent(token: string, agentId: string) {
    return apiClient.delete<void>(`/auth/admin/agents/${agentId}`, token)
  }
}
