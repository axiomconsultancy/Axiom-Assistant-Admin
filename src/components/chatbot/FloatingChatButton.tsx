'use client'

import React from 'react'
import IconifyIcon from '@/components/wrapper/IconifyIcon'
import './FloatingChatButton.scss'

interface FloatingChatButtonProps {
  onClick: () => void
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick }) => {
  return (
    <button className="floating-chat-button" onClick={onClick} title="Chat with AI Assistant">
      <IconifyIcon icon="solar:chat-round-bold-duotone" width={28} height={28} />
    </button>
  )
}
