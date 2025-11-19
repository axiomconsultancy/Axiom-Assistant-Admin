export type UnassignedAgent = {
  id: string
  name: string
}

export type AdminAgent = {
  agent_id?: string
  id?: string
  name?: string
  description?: string
  default_language?: string
  additional_languages?: string[]
  conversation_config?: {
    agent?: {
      name?: string
      prompt?: {
        prompt?: string
        llm?: string
      }
    }
  }
  tts?: {
    voice_id?: string
    mode?: string
  }
  assigned_users?: string[]
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export type AssignmentFilter = 'all' | 'assigned' | 'unassigned'

export interface AdminAgentListResponse {
  items: AdminAgent[]
  total: number
  skip: number
  limit: number
}

export interface AdminAgentQueryParams {
  skip?: number
  limit?: number
  search?: string
  assignment?: AssignmentFilter
}

export type CreateAgentPayload = {
  name: string
  description?: string
  default_language?: string
  additional_languages?: string[]
  conversation_config?: Record<string, any>
  tts?: Record<string, any>
  [key: string]: any
}

