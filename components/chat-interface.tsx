"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageBubble } from "@/components/message-bubble"
import { SuggestedPrompts } from "@/components/suggested-prompts"
import { ArticleCard } from "@/components/article-card"
import { useChatHistory } from "@/hooks/use-chat-history"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  articles?: Array<{
    id: string
    title: string
    author: string
    excerpt: string
    readTime: string
    thumbnail: string
  }>
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your Yakihonne AI Agent. I can help you search through articles, provide summaries, and suggest related content. What would you like to explore today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { addToHistory, saveChat, isChatSaved } = useChatHistory()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    // Create chat session immediately when user sends first message
    let chatId = currentChatId
    if (!chatId && messages.length === 1) {
      chatId = `chat_${Date.now()}`
      setCurrentChatId(chatId)
    }

    const updatedMessagesWithUser = [...messages, userMessage]
    setMessages(updatedMessagesWithUser)

    // Add to history immediately with just the user message
    if (chatId) {
      addToHistory({
        id: chatId,
        title: input.slice(0, 50) + (input.length > 50 ? "..." : ""),
        messages: updatedMessagesWithUser,
        timestamp: new Date().toISOString(),
      })
    }

    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `I found some relevant information about "${userMessage.content}". Here's what I discovered and some related content that might interest you.`,
        timestamp: new Date(),
        articles: [
          {
            id: "1",
            title: "Understanding Nostr Protocol",
            author: "Tech Writer",
            excerpt:
              "A comprehensive guide to the Nostr protocol and its implications for decentralized social media...",
            readTime: "5 min read",
            thumbnail: "/placeholder.svg?height=100&width=150",
          },
          {
            id: "2",
            title: "The Future of Decentralized Publishing",
            author: "Crypto Analyst",
            excerpt: "Exploring how decentralized protocols are reshaping content creation and distribution...",
            readTime: "8 min read",
            thumbnail: "/placeholder.svg?height=100&width=150",
          },
        ],
      }

      const finalMessages = [...updatedMessagesWithUser, aiMessage]
      setMessages(finalMessages)

      // Update history with complete conversation
      if (chatId) {
        addToHistory({
          id: chatId,
          title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? "..." : ""),
          messages: finalMessages,
          timestamp: new Date().toISOString(),
        })
      }

      setIsLoading(false)
    }, 1500)
  }

  const handleSaveChat = () => {
    if (currentChatId && messages.length > 1) {
      saveChat({
        id: currentChatId,
        title: messages[1]?.content.slice(0, 50) + (messages[1]?.content.length > 50 ? "..." : "") || "Untitled Chat",
        messages: messages,
        timestamp: new Date().toISOString(),
      })
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const isSaved = currentChatId ? isChatSaved(currentChatId) : false

  return (
    <div className="flex-1 flex flex-col h-full max-h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <MessageBubble message={message} />
              {message.articles && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Related Articles:</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {message.articles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Prompts */}
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <div className="max-w-4xl mx-auto">
            <SuggestedPrompts onPromptClick={handleSuggestedPrompt} />
          </div>
        </div>
      )}

      {/* Save Chat Button */}
      {messages.length > 1 && (
        <div className="px-4 pb-2">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleSaveChat}
              variant="outline"
              size="sm"
              className={`w-full sm:w-auto ${isSaved ? "text-red-500 border-red-200" : "text-gray-600"}`}
              disabled={isSaved}
            >
              <Heart className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Saved to Favorites" : "Save Chat"}
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about articles, request summaries, or explore topics..."
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-orange-500 hover:bg-orange-600 px-4 sm:px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
