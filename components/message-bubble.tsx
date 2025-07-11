"use client"

import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date | string
  title?: string;
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "user"

  // Ensure we always have a Date instance to avoid runtime errors
  const date = typeof message.timestamp === "string" ? new Date(message.timestamp) : message.timestamp

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser ? "bg-orange-500 text-white" : "bg-white border border-gray-200",
        )}
      >
        {/* Show title and postId for AI messages if present */}
        {!isUser && message.title && (
          <>
            <p className="text-base font-semibold text-gray-900 mb-0.5">{message.title}</p>
           
          </>
        )}
        <p className="text-sm">{message.content}</p>
        <p className={cn("text-xs mt-1", isUser ? "text-orange-100" : "text-gray-500")}>
          {date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  )
}
