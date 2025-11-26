/**
 * API Client for making HTTP requests to the backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type')
      let data: any = null

      if (contentType && contentType.includes('application/json')) {
        try {
          const text = await response.text()
          data = text ? JSON.parse(text) : null
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError)
          return {
            error: 'Invalid response from server',
            status: response.status,
          }
        }
      } else {
        // Handle non-JSON responses
        const text = await response.text()
        data = text || null
      }

      if (!response.ok) {
        return {
          error: data?.detail || data?.message || data?.error || `Request failed with status ${response.status}`,
          status: response.status,
        }
      }

      return {
        data,
        status: response.status,
      }
    } catch (error) {
      console.error('API Request failed:', error)
      return {
        error: error instanceof Error ? error.message : 'Network error. Please check your connection and try again.',
        status: 0,
      }
    }
  }

  async get<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    })
  }

  async post<T>(
    endpoint: string,
    body?: any,
    token?: string
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  async put<T>(
    endpoint: string,
    body?: any,
    token?: string
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    token?: string
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
  }

  async delete<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers,
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

