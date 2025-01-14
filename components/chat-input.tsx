"use client"

import { useState, useRef, useEffect } from "react"
import { SendHorizontal, Paperclip, Mic, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface ChatInputProps {
  onSend: (message: string, file?: File | Blob) => void
  isLoading?: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [input, setInput] = useState("")
  const [mediaFile, setMediaFile] = useState<File | Blob | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [microphoneAvailable, setMicrophoneAvailable] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Handle mounting state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop())
        setMicrophoneAvailable(true)
      })
      .catch(() => {
        setMicrophoneAvailable(false)
        toast.error('Microphone access is not available')
      })
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 150)
      textarea.style.height = `${newHeight}px`
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((input.trim() || mediaFile) && !isLoading) {
      onSend(input, mediaFile || undefined)
      setInput("")
      setMediaFile(null)
      setPreview(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    setMediaFile(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setMediaFile(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setMicrophoneAvailable(false)
      toast.error('Failed to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const clearMedia = () => {
    setMediaFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Only render content after mounting to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="p-4">
        <div className="relative flex items-end gap-2">
          <div className="flex-1">
            <div className="relative flex items-center rounded-xl border border-border/10 bg-secondary">
              <div className="h-[120px]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentTheme = theme === 'system' ? systemTheme : theme
  const inputBgColor = currentTheme === 'dark' ? 'bg-[#303030]' : 'bg-gray-200'
  const hoverBgColor = currentTheme === 'dark' ? 'hover:bg-neutral-700/50' : 'hover:bg-gray-100/80'

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AnimatePresence>
          {(preview || mediaFile) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative inline-block"
            >
              {preview ? (
                <div className="relative">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="h-24 w-auto rounded-lg object-cover shadow-sm"
                  />
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-2 text-sm">
                  Audio recording ready
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background shadow-sm hover:bg-muted"
                onClick={clearMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end gap-2">
          <div className="flex-1">
            <div className={cn(
              "relative flex items-center rounded-xl border border-border/10",
              inputBgColor
            )}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 rounded-xl", hoverBgColor)}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isRecording}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Input Messages..."
                rows={3}
                className="flex-1 bg-transparent px-2 py-2.5 text-sm focus-visible:outline-none min-h-[72px] max-h-[150px] resize-none overflow-hidden"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-xl",
                  hoverBgColor,
                  isRecording && "text-red-500",
                  !microphoneAvailable && "opacity-50 cursor-not-allowed"
                )}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || !!mediaFile || !microphoneAvailable}
                title={!microphoneAvailable ? "Microphone not available" : undefined}
              >
                <Mic className="h-5 w-5" />
              </Button>

              <Button 
                type="submit" 
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 rounded-xl", hoverBgColor)}
                disabled={isLoading || (!input.trim() && !mediaFile)}
              >
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}