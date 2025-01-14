"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { ChatMessage } from "./chat-message"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  media?: {
    type: "image" | "audio"
    url: string
  }
}

interface MessageListProps {
  messages: Message[]
}

export const MessageList = memo(({ messages }: MessageListProps) => (
  <motion.div 
    key="message-list" 
    className="space-y-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
  >
    {messages.map((message) => (
      <ChatMessage
        key={message.id}
        role={message.role}
        content={message.content}
        media={message.media}
      />
    ))}
  </motion.div>
))
MessageList.displayName = 'MessageList'