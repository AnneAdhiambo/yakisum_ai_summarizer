"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageBubble } from "@/components/message-bubble"
import { SuggestedPrompts } from "@/components/suggested-prompts"
import { ArticleCard } from "@/components/article-card"
import { useSavedSummaries } from "@/hooks/use-chat-history"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SWHandler from "smart-widget-handler";
import { toast } from "./ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { nip19 } from "nostr-tools";

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string | Date
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
  postId?: string
  author?: string
  originalTitle?: string // Added for reposting
}

export function ChatInterface() {
  // Load messages from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yakisum_chat_messages');
      if (saved) {
        try {
          // Ensure all timestamps are strings
          const parsed = JSON.parse(saved).map((msg: any) => ({
            ...msg,
            timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date(msg.timestamp).toISOString(),
          }));
          return parsed;
        } catch {}
      }
    }
    return [
      {
        id: "1",
        type: "ai",
        content:
          "Hello! I'm Yakisum, your AI assistant for discovering and summarizing articles from the Yakihonne platform. How can I help you today?",
        timestamp: "", // Use empty string for SSR
      },
    ];
  });
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<string | null>(null)
  const [lastOffset, setLastOffset] = useState<number>(0)
  const [lastTotal, setLastTotal] = useState<number>(0)
  const [lastArticles, setLastArticles] = useState<any[]>([])
  const [lastLimit, setLastLimit] = useState<number>(5)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { savedSummaries, saveSummary, unsaveSummary, isSummarySaved } = useSavedSummaries();
  const [repostModalOpen, setRepostModalOpen] = useState(false);
  const [repostMessage, setRepostMessage] = useState<Message | null>(null);
  const [repostContent, setRepostContent] = useState("");
  const [repostTags, setRepostTags] = useState("");
  // Track summarized article IDs to prevent double summaries
  const [summarizedArticleIds, setSummarizedArticleIds] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // On mount, if the first message has an empty timestamp, set it to now (client only)
  useEffect(() => {
    if (messages.length === 1 && messages[0].timestamp === "") {
      setMessages([{ ...messages[0], timestamp: new Date().toISOString() }]);
    }
  }, []);

  useEffect(() => {
    const listener = SWHandler.client.listen((data: any) => {
      // Success: raw nostr event (kind, id, sig)
      if (data.kind === 'nostr-event' && data.id && data.sig) {
        toast({
          title: 'Repost published!',
          description: 'Your summary was successfully posted to Yakihonne.',
          variant: 'default',
        });
      }
      // Error: wrapper with status
      else if (data.kind === 'nostr-event' && data.data?.status === 'error') {
        toast({
          title: 'Repost failed',
          description: data.data?.error || 'There was an error publishing your summary to Yakihonne.',
          variant: 'destructive',
        });
      }
    });
    return () => listener.close && listener.close();
  }, []);

  // Persist messages to localStorage on every change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yakisum_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Reset summarizedArticleIds when a new summary is added
  useEffect(() => {
    if (messages.length > 0) {
      setSummarizedArticleIds(new Set());
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date().toISOString(),
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
      // This part of history saving is removed as per the edit hint
    }

    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache", // Prevent caching
        },
        body: JSON.stringify({ 
          query: input, 
          offset: 0, 
          limit: 5, // Always start with limit 5 for new searches
          timestamp: Date.now(), // Add timestamp to prevent caching
        }),
      })
      const data = await res.json()
      console.log('Yakihonne API response:', data.body.articles); // <-- Add this log

      setLastQuery(input)
      setLastOffset(data.body?.articles?.length || 0)
      setLastTotal(data.body?.total || 0)
      setLastArticles(data.body?.articles || [])
      setLastLimit(data.body?.limit || 5)

      // If summarizing a specific article, copy its tags
      let tags: string[] | undefined = undefined;
      if (data.body?.articles && data.body.articles.length === 1 && Array.isArray(data.body.articles[0].tags)) {
        tags = data.body.articles[0].tags;
      }
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.body?.summary || "No summary returned.",
        timestamp: new Date().toISOString(),
        debugContent: data.body?.debugContent || "",
        articles: data.body?.articles || [],
        title: data.body?.title || undefined,
        ...(tags ? { tags } : {}),
      }

      const finalMessages = [...updatedMessagesWithUser, aiMessage]
      setMessages(finalMessages)

      // This part of history saving is removed as per the edit hint
    } catch (err) {
      setMessages([
        ...updatedMessagesWithUser,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: "Sorry, there was an error summarizing your request.",
          timestamp: new Date().toISOString(),
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

  // This function is no longer needed as chat saving is removed
  const handleSaveChat = () => {
    // This part of history saving is removed as per the edit hint
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
  }

  // This function is no longer needed as chat saving is removed
  const isSaved = currentChatId ? false : false; // Placeholder, as chat saving is removed

  const handleRepost = (message: Message) => {
    setRepostMessage(message);
    setRepostContent(message.content);
    // Prefill tags from message or repostMessage
    let tags: string[] = [];
    if (Array.isArray((message as any).tags)) {
      tags = (message as any).tags;
    } else if (repostMessage && Array.isArray((repostMessage as any).tags)) {
      tags = (repostMessage as any).tags;
    }
    setRepostTags(tags.length > 0 ? tags.map((t: string) => `#${t}`).join(", ") : "");
    setRepostModalOpen(true);
  };

  const handleRepostCancel = () => {
    setRepostModalOpen(false);
    setRepostMessage(null);
    setRepostContent("");
    setRepostTags("");
  };

  const handleRepostConfirm = () => {
    if (!repostContent.trim()) {
      toast({ title: "Cannot repost empty summary", variant: "destructive" });
      return;
    }
    // Parse tags (comma or space separated, remove #, trim)
    const tags = repostTags
      .split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean)
      .map(t => ['t', t]);
    // Optionally add a title tag if available
    if (repostMessage?.title) {
      tags.push(['title', repostMessage.title]);
    }
    // Build Nostr event draft
    const eventDraft = {
      content: repostContent,
      tags,
      kind: 1, // Kind 1 = note/post
    };
    try {
      SWHandler.client.requestEventPublish(
        eventDraft,
        window.location.ancestorOrigins?.[0] || '*'
      );
      toast({ title: "Repost requested!", description: "Check your Yakisum parent app for confirmation." });
    } catch (err) {
      toast({ title: "Failed to repost", description: String(err), variant: "destructive" });
    }
    setRepostModalOpen(false);
    setRepostMessage(null);
    setRepostContent("");
    setRepostTags("");
  };

  // Clear chat handler
  const handleClearChat = () => {
    const initialMessage: Message = {
      id: "1",
      type: "ai",
      content:
        "Hello! I'm Yakisum, your AI assistant for discovering and summarizing articles from the Yakihonne platform. How can I help you today?",
      timestamp: new Date().toISOString(),
    };
    setMessages([initialMessage]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yakisum_chat_messages', JSON.stringify([initialMessage]));
    }
    scrollToBottom();
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white/80 dark:bg-black/40 sticky top-0 z-10">
        <span className="font-semibold text-lg">Yakihonne Chat</span>
        <Button variant="outline" size="sm" onClick={handleClearChat} title="Clear chat">
          Clear Chat
        </Button>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              <MessageBubble
                message={message}
                onRepost={message.type === 'ai' ? handleRepost : undefined}
                isSaved={message.type === 'ai' && isSummarySaved(message.id)}
                onSave={message.type === 'ai' ? () => {
                  saveSummary({
                    id: message.id,
                    title: message.title,
                    content: message.content,
                    timestamp: message.timestamp,
                    postId: message.postId,
                    author: message.author,
                    originalTitle: message.originalTitle,
                  });
                  toast({ title: 'Summary saved!', description: 'You can find it in Saved Summaries.', variant: 'default' });
                } : undefined}
                onUnsave={message.type === 'ai' ? () => {
                  unsaveSummary(message.id);
                  toast({ title: 'Summary removed', description: 'Removed from Saved Summaries.', variant: 'destructive' });
                } : undefined}
              />
              {message.debugContent && (
                <pre className="text-xs text-gray-400 bg-gray-100 p-2 rounded mt-2">
                  {message.debugContent}
                </pre>
              )}
              {message.articles && message.articles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Articles:</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {(message.articles || []).map((article) => {
                      // Patch for legacy shape: fill missing fields for ArticleCard
                      const patched = {
                        ...article,
                        authorName: article.author?.substring?.(0, 8) || "Unknown",
                        timeAgo: "recently",
                        url: (article as any).url || "#",
                        stats: (article as any).stats || { likes: 0, replies: 0, zaps: 0, reposts: 0 },
                      };
                      const isSummarized = summarizedArticleIds.has(patched.id);
                      return (
                        <div key={patched.id}
                          onClick={async () => {
                            if (isSummarized) return;
                            setSummarizedArticleIds(prev => new Set(prev).add(patched.id));
                            // Scroll immediately
                            scrollToBottom();
                            setIsLoading(true);
                            // Try to generate naddr if possible
                            let articleAddr = undefined;
                            try {
                              if ((article as any).kind === 30023 && (article as any).pubkey && Array.isArray((article as any).tags)) {
                                const identifier = (article as any).tags.find((tag: any) => tag[0] === 'd')?.[1];
                                if (identifier) {
                                  articleAddr = nip19.naddrEncode({
                                    kind: 30023,
                                    pubkey: (article as any).pubkey,
                                    identifier,
                                    relays: [],
                                  });
                                }
                              }
                            } catch {}
                            try {
                              const res = await fetch("/api/summarize", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ articleId: patched.id, articleAddr }),
                              });
                              const data = await res.json();
                              setMessages(prev => ([
                                ...prev.filter(m => typeof m === 'object' && m !== null && 'id' in m),
                                {
                                  id: (Date.now() + Math.random()).toString(),
                                  type: "ai",
                                  content: data.body?.summary || "No summary returned.",
                                  timestamp: new Date().toISOString(),
                                  title: data.body?.title || undefined,
                                  postId: data.body?.postId || undefined,
                                  tags: Array.isArray(data.body?.articles?.[0]?.tags) ? data.body.articles[0].tags : undefined,
                                },
                              ]));
                            } catch (err) {
                              setMessages(prev => ([
                                ...prev.filter(m => typeof m === 'object' && m !== null && 'id' in m),
                                {
                                  id: (Date.now() + Math.random()).toString(),
                                  type: "ai",
                                  content: "Sorry, there was an error summarizing this article.",
                                  timestamp: new Date().toISOString(),
                                },
                              ]));
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          style={{ cursor: isSummarized ? "not-allowed" : "pointer", opacity: isSummarized ? 0.5 : 1 }}
                        >
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
      {/* This section is removed as chat saving is removed */}

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

      {/* Repost Modal */}
      <Dialog open={repostModalOpen} onOpenChange={setRepostModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repost Summary to Yakihonne</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={repostContent}
              onChange={e => setRepostContent(e.target.value)}
              className="w-full min-h-[100px]"
              placeholder="Edit your summary before reposting..."
            />
            <Input
              value={repostTags}
              onChange={e => setRepostTags(e.target.value)}
              className="w-full"
              placeholder="Add tags (comma or space separated)"
            />
            {/* Show tags as badges if present in repostMessage */}
            {repostMessage && Array.isArray((repostMessage as any)?.tags) && (repostMessage as any)?.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(repostMessage as any).tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">#{tag}</Badge>
                ))}
              </div>
            )}
            {/* Reference to original post, below tags */}
            {repostMessage && (repostMessage.originalTitle || repostMessage.postId || repostMessage.author) && (
              <div className="bg-gray-50 border border-gray-200 rounded p-2 mt-2 text-xs text-gray-600 flex flex-col gap-1">
                <div className="font-semibold text-gray-800">Original Reference</div>
                {repostMessage.originalTitle && (
                  <div><span className="font-medium">Title:</span> {repostMessage.originalTitle}</div>
                )}
                {repostMessage.postId && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Post ID:</span>
                    <span className="font-mono break-all">
                      {repostMessage.postId.slice(0, 8)}...{repostMessage.postId.slice(-6)}
                    </span>
                    <button
                      className="ml-1 px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-xs font-mono"
                      title="Copy Post ID"
                      type="button"
                      onClick={() => navigator.clipboard.writeText(repostMessage.postId || "")}
                    >
                      Copy
                    </button>
                  </div>
                )}
                {repostMessage.author && (
                  <div><span className="font-medium">Author:</span> <span className="font-mono">{repostMessage.author}</span></div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRepostCancel}>Cancel</Button>
            <Button onClick={handleRepostConfirm} className="bg-orange-500 hover:bg-orange-600 text-white">Repost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
