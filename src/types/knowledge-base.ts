export type KnowledgeBaseDependentAgent = {
  agent_id: string
  name?: string
}

export type KnowledgeBaseDocumentSource = {
  type?: string
  url?: string
  bucket?: string
  path?: string
  [key: string]: any
}

export type KnowledgeBaseDocument = {
  id: string
  name?: string
  type?: string
  status?: string
  tokens?: number
  token_count?: number
  estimated_token_count?: number
  created_at?: string
  updated_at?: string
  last_used_at?: string
  dependent_agents?: KnowledgeBaseDependentAgent[]
  metadata?: Record<string, any>
  source?: KnowledgeBaseDocumentSource
  usage_mode?: string
  [key: string]: any
}

export type KnowledgeBaseListResponse = {
  documents: KnowledgeBaseDocument[]
  next_cursor?: string | null
  previous_cursor?: string | null
  cursor?: string | null
}

export type KnowledgeBaseQueryParams = {
  page_size?: number
  cursor?: string | null
  search?: string
  types?: string[]
  show_only_owned?: boolean
  use_typesense?: boolean
}

