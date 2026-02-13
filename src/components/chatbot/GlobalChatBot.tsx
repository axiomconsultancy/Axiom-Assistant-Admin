'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ChatBot } from './ChatBot'
import { FloatingChatButton } from './FloatingChatButton'

const IS_STARTED_KEY = 'chatbot_is_started'
const IS_OPEN_KEY = 'chatbot_is_open'

export const GlobalChatBot: React.FC = () => {
    const [isStarted, setIsStarted] = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem(IS_STARTED_KEY) === 'true'
    })

    const [isOpen, setIsOpen] = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem(IS_OPEN_KEY) === 'true'
    })

    // Listen for custom trigger event
    useEffect(() => {
        const handleTrigger = () => {
            setIsStarted(true)
            setIsOpen(true)
        }

        window.addEventListener('toggle-chatbot', handleTrigger)
        return () => window.removeEventListener('toggle-chatbot', handleTrigger)
    }, [])

    // Persist state
    useEffect(() => {
        localStorage.setItem(IS_STARTED_KEY, isStarted.toString())
        localStorage.setItem(IS_OPEN_KEY, isOpen.toString())
    }, [isStarted, isOpen])

    const handleClose = () => {
        setIsStarted(false)
        setIsOpen(false)
    }

    const handleMinimize = () => {
        setIsOpen(false)
    }

    const handleOpen = () => {
        setIsOpen(true)
    }

    if (!isStarted) return null

    return (
        <>
            <ChatBot
                isOpen={isOpen}
                onClose={handleClose}
                onMinimize={handleMinimize}
            />
            {!isOpen && <FloatingChatButton onClick={handleOpen} />}
        </>
    )
}
