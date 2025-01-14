"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { ChatInput } from "@/components/chat-input"
import { ChatList } from "@/components/chat-list"
import { EmptyState } from "@/components/chat/empty-state"
import { LoadingSpinner } from "@/components/chat/loading-spinner"
import { MessageList } from "@/components/chat/message-list"
import { useChat } from "@/lib/hooks/use-chat"

export default function Home() {
  const {
    chats,
    currentChat,
    currentChatId,
    isLoading,
    chatContainerRef,
    setCurrentChatId,
    createNewChat,
    removeChat,
    sendMessage,
    scrollToBottom
  } = useChat()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Scroll on new messages
  useEffect(() => {
    if (currentChat?.messages?.length) {
      scrollToBottom(false)
    }
  }, [currentChat?.messages, scrollToBottom])

  // Scroll when loading state changes
  useEffect(() => {
    if (!isLoading && currentChat?.messages?.length) {
      scrollToBottom(false)
    }
  }, [isLoading, currentChat?.messages?.length, scrollToBottom])

  // Scroll when switching chats
  useEffect(() => {
    if (currentChatId && currentChat?.messages?.length) {
      scrollToBottom(true)
    }
  }, [currentChatId, currentChat?.messages?.length, scrollToBottom])

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex w-60 h-full flex-col bg-secondary border-r border-border/10">
        <ChatList
          chats={chats}
          currentChatId={currentChatId}
          onSelect={setCurrentChatId}
          onNew={createNewChat}
          onRemove={removeChat}
        />
      </div>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden absolute left-2 top-2 z-10"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px] bg-secondary">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <ChatList
            chats={chats}
            currentChatId={currentChatId}
            onSelect={(id) => {
              setCurrentChatId(id)
              setIsSidebarOpen(false)
            }}
            onNew={createNewChat}
            onRemove={removeChat}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div 
          ref={chatContainerRef}
          className="flex-1 p-4 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait" initial={false}>
              {!currentChat || currentChat.messages.length === 0 ? (
                <EmptyState key="empty-state" />
              ) : (
                <MessageList key="message-list" messages={currentChat.messages} />
              )}
              {isLoading && <LoadingSpinner key="loading-spinner" />}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  )
}