'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Form, FormControl, FormLabel, FormSelect, InputGroup, Spinner, Button } from 'react-bootstrap'
import { useVoices } from '@/context/useVoicesContext'
import IconifyIcon from '@/components/wrapper/IconifyIcon'

interface VoiceSelectorProps {
  value: string
  onChange: (voiceId: string) => void
  token: string | null
  isInvalid?: boolean
  errorMessage?: string
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  token,
  isInvalid,
  errorMessage
}) => {
  const { voices, isLoading, fetchVoices, getVoiceById } = useVoices()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selectedVoice = value ? getVoiceById(value) : null

  // Fetch voices on mount if token is available and voices are not loaded
  useEffect(() => {
    if (token && voices.length === 0 && !isLoading) {
      fetchVoices(token)
    }
  }, [token, voices.length, isLoading, fetchVoices])

  // Filter voices based on search
  const filteredVoices = voices.filter((voice) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      voice.name.toLowerCase().includes(query) ||
      voice.voice_id.toLowerCase().includes(query)
    )
  })

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (e.target.value.trim() && token) {
      fetchVoices(token, e.target.value.trim())
    }
  }

  const handlePreview = (e: React.MouseEvent, voiceId: string, previewUrl?: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!previewUrl) return

    if (playingPreview === voiceId) {
      // Stop if already playing
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setPlayingPreview(null)
    } else {
      // Play new preview
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPlayingPreview(voiceId)
      const audio = new Audio(previewUrl)
      audioRef.current = audio
      audio.play().catch((err) => {
        console.error('Error playing preview:', err)
        setPlayingPreview(null)
      })
      audio.onended = () => setPlayingPreview(null)
      audio.onerror = () => setPlayingPreview(null)
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  return (
    <div>
      <FormLabel>Voice ID <span className="text-danger">*</span></FormLabel>

      <InputGroup className="mb-2">
        <FormSelect
          value={value}
          onChange={handleSelectChange}
          isInvalid={isInvalid}
          disabled={isLoading}
        >
          <option value="">Select a voice...</option>
          {filteredVoices.map((voice) => (
            <option key={voice.voice_id} value={voice.voice_id}>
              {voice.name} ({voice.voice_id})
            </option>
          ))}
        </FormSelect>
        <Button
          variant="outline-secondary"
          onClick={() => setShowSearch(!showSearch)}
          title="Search voices"
        >
          <IconifyIcon icon="solar:magnifer-outline" width={16} height={16} />
        </Button>
        {selectedVoice?.preview_url && (
          <Button
            variant="outline-primary"
            onClick={(e) => handlePreview(e, selectedVoice.voice_id, selectedVoice.preview_url)}
            title="Preview selected voice"
          >
            {playingPreview === selectedVoice.voice_id ? (
              <IconifyIcon icon="solar:stop-circle-outline" width={16} height={16} />
            ) : (
              <IconifyIcon icon="solar:play-circle-outline" width={16} height={16} />
            )}
          </Button>
        )}
        {isLoading && (
          <InputGroup.Text>
            <Spinner size="sm" />
          </InputGroup.Text>
        )}
      </InputGroup>

      {showSearch && (
        <FormControl
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search voices by name or ID..."
          className="mb-2"
        />
      )}

      {selectedVoice && (
        <div className="mb-2">
          <Form.Text className="text-muted">
            Selected: <strong>{selectedVoice.name}</strong>
          </Form.Text>
        </div>
      )}

      {isInvalid && errorMessage && (
        <Form.Control.Feedback type="invalid" className="d-block">
          {errorMessage}
        </Form.Control.Feedback>
      )}

      <Form.Text className="text-muted">Required: ElevenLabs voice identifier</Form.Text>
    </div>
  )
}

export default VoiceSelector

