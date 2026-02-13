'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from 'react-bootstrap'
import IconifyIcon from '@/components/wrapper/IconifyIcon'
import { chatbotApi, type ChatMessage } from '@/api/org/chatbot'
import { useAuth } from '@/context/useAuthContext'
import { isOrgUser } from '@/types/auth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ChatBot.scss'

// Storage keys
const STORAGE_KEYS = {
  MESSAGES: 'chatbot_messages',
  CONVERSATION_ID: 'chatbot_conversation_id',
  TERMS_ACCEPTED: 'chatbot_terms_accepted',
  IS_OPEN: 'chatbot_is_open'
}

interface ChatBotProps {
  isOpen: boolean
  onClose: () => void
  onMinimize?: () => void
}

interface Message extends ChatMessage {
  id: string
  timestamp: Date
  isStreaming?: boolean
}

export const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, onMinimize }) => {
  const { user } = useAuth()

  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      } catch (e) {
        console.error('Failed to parse stored messages:', e)
        return []
      }
    }
    return []
  })

  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [conversationId, setConversationId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID) || ''
  })

  const [agentName, setAgentName] = useState('AI Agent')

  const [termsAccepted, setTermsAccepted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED) === 'true'
  })
  const [isClosing, setIsClosing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to minimize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (onMinimize) onMinimize()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onMinimize])

  // Persistence effects
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Save conversation ID
    if (conversationId) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId)
    }

    // Save terms status
    localStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, termsAccepted.toString())

    // Save messages (filtered out streaming ones)
    const messagesToStore = messages.filter(m => !m.isStreaming)
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesToStore))
  }, [messages, conversationId, termsAccepted])

  useEffect(() => {
    if (isOpen && !conversationId) {
      // Generate a conversation ID
      const id = Date.now().toString()
      setConversationId(id)

      // Initial greeting if no messages exist
      if (messages.length === 0) {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: 'Welcome to our AI support assistant! We use your messages to improve our services, and for other purposes consistent with our privacy policy.',
            timestamp: new Date()
          }
        ])
      }
    }

    if (isOpen && conversationId && isOrgUser(user) && user.org_id) {
      // Load context
      chatbotApi.getContext(user.org_id).then((context) => {
        if (context.agent_name) {
          setAgentName(context.agent_name)
        }
      }).catch((err) => {
        console.error('Failed to load chatbot context:', err)
      })
    }
  }, [isOpen, conversationId, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [inputValue])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendChatMessage = async (userMessage: Message, historyMessages: Message[]) => {
    if (!isOrgUser(user) || !user.org_id) return

    // Create assistant message placeholder for streaming
    const assistantMessageId = `${Date.now()}-assistant`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Prepare conversation history
      const history: ChatMessage[] = historyMessages
        .filter((msg) => msg.id !== userMessage.id && msg.id !== assistantMessageId)
        .map((msg) => ({
          role: msg.role,
          content: msg.content
        }))

      // Stream the response
      const stream = chatbotApi.sendMessageStream(user.org_id, {
        message: userMessage.content,
        conversation_history: history
      })

      let fullResponse = ''

      for await (const chunk of stream) {
        fullResponse += chunk
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullResponse, isStreaming: true }
              : msg
          )
        )
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
        )
      )
    } catch (error: any) {
      console.error('Failed to send message:', error)

      // Show error message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
              ...msg,
              content: 'Sorry, I encountered an error. Please try again or contact support.',
              isStreaming: false
            }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isOrgUser(user) || !user.org_id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    await sendChatMessage(userMessage, messages)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (action: string) => {
    if (isLoading || !isOrgUser(user) || !user.org_id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: action,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    sendChatMessage(userMessage, messages)
  }

  const handleClose = () => {
    // Explicit close = clear session
    const confirmClose = window.confirm('Are you sure you want to close the chat? This will clear your current conversation history.')
    if (!confirmClose) return

    setIsClosing(true)
    setTimeout(() => {
      // Clear persistence
      localStorage.removeItem(STORAGE_KEYS.MESSAGES)
      localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID)
      localStorage.removeItem(STORAGE_KEYS.TERMS_ACCEPTED)

      setIsClosing(false)
      onClose()

      // Reset local state if needed (though component will unmount)
      setMessages([])
      setConversationId('')
      setTermsAccepted(false)
    }, 300)
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className="chatbot-overlay">
      <div
        ref={containerRef}
        className={`chatbot-container ${isClosing ? 'chatbot-closing' : ''}`}
      >
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-agent-icon">
              <IconifyIcon icon="solar:chat-round-bold" width={20} height={20} />
            </div>
            <span className="chatbot-agent-name">{agentName}</span>
          </div>
          <div className="chatbot-header-actions">
            {onMinimize && (
              <button className="chatbot-header-btn" onClick={onMinimize} title="Minimize">
                <IconifyIcon icon="solar:minus-circle-bold" width={20} height={20} />
              </button>
            )}
            <button className="chatbot-header-btn chatbot-header-btn-close" onClick={handleClose} title="Close & End Session">
              <IconifyIcon icon="solar:close-circle-bold" width={20} height={20} />
            </button>
          </div>
        </div>

        <div className="chatbot-messages">
          {messages.map((message, index) => (
            <div key={message.id}>
              {message.role === 'assistant' && index === 0 && !termsAccepted && (
                <div className="chatbot-message chatbot-message-assistant">
                  <div className="chatbot-message-content">
                    <div className="chatbot-markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                    <p className="mb-3">Please indicate whether you agree to these conditions of use.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setTermsAccepted(true)}
                      className="chatbot-accept-btn"
                    >
                      Accept
                    </Button>
                  </div>
                  <div className="chatbot-message-meta">
                    <span>{agentName}</span>
                    <span className="chatbot-message-dot"></span>
                    <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              )}

              {(index > 0 || termsAccepted) && (
                <div className={`chatbot-message chatbot-message-${message.role}`}>
                  <div className="chatbot-message-content">
                    <div className="chatbot-markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      {message.isStreaming && (
                        <div className="chatbot-typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chatbot-message-meta">
                    {message.role === 'assistant' && (
                      <>
                        <span>{agentName}</span>
                        <span className="chatbot-message-dot"></span>
                      </>
                    )}
                    <span>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {termsAccepted && messages.length === 1 && (
            <div className="chatbot-conversation-id">
              <div className="chatbot-conversation-prompt">Let us know what your inquiry is about.</div>
              <div className="chatbot-quick-actions">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleQuickAction('Tell me about the company')}
                >
                  About the company
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleQuickAction('Tell me about the agent')}
                >
                  About the agent
                </Button>
              </div>
              <div className="chatbot-conversation-instructions">
                Go ahead and provide the details of your inquiry below.
              </div>
              <div className="chatbot-message-meta">
                <span>{agentName}</span>
                <span className="chatbot-message-dot"></span>
                <span>Just now</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {termsAccepted && (
          <div className="chatbot-input-container">
            <div className="chatbot-input-wrapper">
              <textarea
                ref={textareaRef}
                className="chatbot-input"
                placeholder="Message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
              />
              <button
                className="chatbot-send-btn"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                title="Send message"
              >
                <IconifyIcon icon="solar:plain-2-bold" width={16} height={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
