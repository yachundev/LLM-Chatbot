"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { User, Bot } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { CodeBlock } from "./code-block"

interface ChatMessageProps {
  content: string
  role: "user" | "assistant"
  media?: {
    type: "image" | "audio"
    url: string
  }
}

function formatMessageContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/^```(\w+)?\n([\s\S]*?)```$/)
      const language = match?.[1]
      const code = match?.[2] || part.slice(3, -3)
      return <CodeBlock key={index} code={code} language={language} />
    }
    return <p key={index} className="whitespace-pre-wrap break-words">{part}</p>
  })
}

export const ChatMessage = memo(({ content, role, media }: ChatMessageProps) => {
  const isUser = role === "user"
  const { theme } = useTheme()

  const userBgColor = theme === 'dark' ? 'bg-[#303030]' : 'bg-gray-100'
  const userIconBgColor = theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-200'
  const userTextColor = theme === 'dark' ? 'text-neutral-100' : 'text-gray-900'
  const assistantTextColor = theme === 'dark' ? 'text-neutral-100' : 'text-gray-900'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full items-start gap-4 p-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full",
        isUser
          ? cn(userIconBgColor, userTextColor)
          : "bg-primary text-primary-foreground"
      )}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      <div className={cn(
        "space-y-4 overflow-hidden max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        {media && (
          <div className={cn(
            "mb-4",
            isUser ? "ml-auto" : "mr-auto"
          )}>
            {media.type === 'image' ? (
              <div className="max-w-sm rounded-lg overflow-hidden shadow-sm">
                {media.url.startsWith('data:image/') ? (
                  // Handle base64 image
                  <img 
                    src={media.url} 
                    alt="Generated image"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                ) : (
                  // Handle regular URL image with fallback
                  <img 
                    src={media.url} 
                    alt="Generated image"
                    className="w-full h-auto object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.startsWith('data:image/')) {
                        // Try to load as base64 if URL fails
                        img.src = `data:image/png;base64,${media.url}`;
                      }
                      console.log('Image load error, url:', media.url);
                    }}
                  />
                )}
              </div>
            ) : (
              <audio 
                controls 
                src={media.url}
                className="w-full max-w-sm"
              />
            )}
          </div>
        )}
        <div className={cn(
          "space-y-4",
          isUser 
            ? cn("rounded-2xl px-4 py-3", userBgColor, userTextColor)
            : assistantTextColor
        )}>
          <div className="text-sm leading-relaxed space-y-4">
            {formatMessageContent(content)}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
ChatMessage.displayName = 'ChatMessage'