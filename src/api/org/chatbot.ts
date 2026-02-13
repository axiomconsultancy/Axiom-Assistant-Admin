import { apiClient } from '../client'
import axiosInstance from '../client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  conversation_history?: ChatMessage[]
}

export interface ChatResponse {
  response: string
  blocked: boolean
}

export interface ChatContext {
  organization_name?: string
  agent_name?: string
  context_data?: any
}

const PREFIX = '/website-chatbot'

export const chatbotApi = {
  /**
   * Get initialization context for the chatbot
   */
  async getContext(orgId: string): Promise<ChatContext> {
    return apiClient.get<ChatContext>(`${PREFIX}/${orgId}/context`)
  },

  /**
   * Send a message and get a JSON response
   */
  async sendMessage(orgId: string, request: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>(`${PREFIX}/${orgId}/chat`, request)
  },

  /**
   * Send a message and get a streaming response (SSE)
   * Returns an async generator that yields chunks
   */
  async* sendMessageStream(orgId: string, request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const baseURL = axiosInstance.defaults.baseURL || ''

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${baseURL}${PREFIX}/${orgId}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    console.log('Chatbot stream response headers:', response.status, response.statusText)

    if (!response.ok) {
      console.error('Chatbot stream failed:', response.status, response.statusText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      console.error('Chatbot stream response body is not readable')
      throw new Error('Response body is not readable')
    }

    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          console.log('Chatbot stream reading complete')
          break
        }

        const decoded = decoder.decode(value, { stream: true })
        console.debug('Chatbot stream chunk received:', decoded.length, 'bytes')

        buffer += decoded
        const lines = buffer.split('\n')

        // Keep the last line in the buffer if it's incomplete
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.substring(6)
            try {
              const data = JSON.parse(jsonStr)
              if (data.content) {
                yield data.content
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', trimmedLine)
            }
          }
        }
      }
    } catch (err) {
      console.error('Chatbot stream error during reading:', err)
      throw err
    } finally {
      reader.releaseLock()
    }
  }
}
