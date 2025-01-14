"use client"

import { memo } from "react"
import { Bot } from "lucide-react"

export const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-muted-foreground">
    <Bot className="h-12 w-12 mb-4" />
    <p className="text-lg font-medium">Start a conversation</p>
    <p className="text-sm">Send a message to generate text, images, or audio</p>
  </div>
))
EmptyState.displayName = 'EmptyState'