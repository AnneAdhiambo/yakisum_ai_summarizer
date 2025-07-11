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
  debugContent?: string // Added for debugging
  title?: string // Added for AI messages
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm your Yakihonne AI Agent. How can I assist you today?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
  const [lastOffset, setLastOffset] = useState<number>(0)
  const [lastTotal, setLastTotal] = useState<number>(0)
  const [lastArticles, setLastArticles] = useState<any[]>([])
  const [lastLimit, setLastLimit] = useState<number>(5)
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

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input, offset: 0, limit: lastLimit }),
      })
      const data = await res.json()

      setLastQuery(input)
      setLastOffset(data.body?.articles?.length || 0)
      setLastTotal(data.body?.total || 0)
      setLastArticles(data.body?.articles || [])
      setLastLimit(data.body?.limit || 5)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.body?.summary || "No summary returned.",
        timestamp: new Date(),
        debugContent: data.body?.debugContent || "",
        articles: data.body?.articles || [],
        title: data.body?.title || undefined,
      }

      const finalMessages = [...updatedMessagesWithUser, aiMessage]
      setMessages(finalMessages)

      if (chatId) {
        addToHistory({
          id: chatId,
          title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? "..." : ""),
          messages: finalMessages,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (err) {
      setMessages([
        ...updatedMessagesWithUser,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: "Sorry, there was an error summarizing your request.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Show more handler
  const handleShowMore = async () => {
    if (!lastQuery || isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lastQuery, offset: lastOffset, limit: lastLimit }),
      })
      const data = await res.json()
      const newArticles = data.body?.articles || [];
      // Deduplicate by id
      const allArticles = [...lastArticles, ...newArticles].filter((article, index, self) =>
        index === self.findIndex(a => a.id === article.id)
      );
      setLastArticles(allArticles)
      setLastOffset(allArticles.length)
      setLastTotal(data.body?.total || allArticles.length)
      setLastLimit(data.body?.limit || lastLimit)
      // Update the last AI message with the new articles
      setMessages((prev) => {
        const updated = [...prev]
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === "ai" && updated[i].articles) {
            updated[i] = {
              ...updated[i],
              articles: allArticles,
              content: data.body?.summary || updated[i].content,
              title: data.body?.title || updated[i].title,
            }
            break
          }
        }
        return updated
      })
    } catch (err) {
      // Optionally show error
    } finally {
      setIsLoading(false)
    }
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
              {message.debugContent && (
                <pre className="text-xs text-gray-400 bg-gray-100 p-2 rounded mt-2">
                  {message.debugContent}
                </pre>
              )}
              {message.articles && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Articles:</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {message.articles.map((article) => {
                      // Patch for legacy shape: fill missing fields for ArticleCard
                      const patched = {
                        ...article,
                        authorName: article.author?.substring?.(0, 8) || "Unknown",
                        timeAgo: "recently",
                        url: (article as any).url || "#",
                        stats: (article as any).stats || { likes: 0, replies: 0, zaps: 0, reposts: 0 },
                      };
                      // Add click handler for summarization
                      return (
                        <div key={patched.id} onClick={async () => {
                          // Prevent duplicate summaries for the same article
                          if (messages.some(m => m.type === "ai" && m.content && m.content.includes(patched.title))) return;
                          setIsLoading(true);
                          try {
                            const res = await fetch("/api/summarize", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ articleId: patched.id }),
                            });
                            const data = await res.json();
                            setMessages(prev => ([
                              ...prev,
                              {
                                id: (Date.now() + Math.random()).toString(),
                                type: "ai",
                                content: data.body?.summary || "No summary returned.",
                                timestamp: new Date(),
                                title: data.body?.title || undefined,
                                postId: data.body?.postId || undefined,
                              },
                            ]));
                          } catch (err) {
                            setMessages(prev => ([
                              ...prev,
                              {
                                id: (Date.now() + Math.random()).toString(),
                                type: "ai",
                                content: "Sorry, there was an error summarizing this article.",
                                timestamp: new Date(),
                              },
                            ]));
                          } finally {
                            setIsLoading(false);
                          }
                        }} style={{ cursor: "pointer" }}>
                          <ArticleCard article={patched} />
                        </div>
                      );
                    })}
                  </div>
                  {/* Show more button */}
                  {lastQuery && lastTotal > lastOffset && message.articles.length === lastArticles.length && (
                    <div className="flex justify-center mt-4">
                      <Button onClick={handleShowMore} disabled={isLoading} variant="outline">
                        Show more
                      </Button>
                    </div>
                  )}
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
