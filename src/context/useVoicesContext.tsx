'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { adminAgentApi } from '@/lib/admin-agent-api'
import type { Voice } from '@/types/admin-agent'

interface VoicesContextType {
  voices: Voice[]
  isLoading: boolean
  error: string | null
  fetchVoices: (token: string, search?: string) => Promise<void>
  getVoiceById: (voiceId: string) => Voice | undefined
  clearVoices: () => void
}

const VoicesContext = createContext<VoicesContextType | undefined>(undefined)

export function VoicesProvider({ children }: { children: React.ReactNode }) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVoices = useCallback(async (token: string, search?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await adminAgentApi.getVoices(token, {
        limit: 1000,
        search: search || undefined
      })

      if (response.error || !response.data) {
        setError(response.error || 'Failed to load voices')
        return
      }

      const voiceList = Array.isArray(response.data)
        ? response.data
        : response.data.items || []

      // If search is provided, replace voices. Otherwise, merge with existing
      if (search) {
        setVoices(voiceList)
      } else {
        // Merge and deduplicate by voice_id
        setVoices((prev) => {
          const existingIds = new Set(prev.map((v) => v.voice_id))
          const newVoices = voiceList.filter((v) => !existingIds.has(v.voice_id))
          return [...prev, ...newVoices]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices')
      console.error('Error fetching voices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getVoiceById = useCallback(
    (voiceId: string) => {
      return voices.find((v) => v.voice_id === voiceId)
    },
    [voices]
  )

  const clearVoices = useCallback(() => {
    setVoices([])
    setError(null)
  }, [])

  const value: VoicesContextType = {
    voices,
    isLoading,
    error,
    fetchVoices,
    getVoiceById,
    clearVoices
  }

  return <VoicesContext.Provider value={value}>{children}</VoicesContext.Provider>
}

export function useVoices() {
  const context = useContext(VoicesContext)
  if (context === undefined) {
    throw new Error('useVoices must be used within a VoicesProvider')
  }
  return context
}

