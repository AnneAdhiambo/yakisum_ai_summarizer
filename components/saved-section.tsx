"use client"

import { useState } from "react"
import { Search, Trash2, MessageSquare, Calendar, ArrowRight, Eye, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { MessageBubble } from "@/components/message-bubble"
import { useSavedSummaries } from "@/hooks/use-chat-history"

export function SavedSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const { savedSummaries, unsaveSummary } = useSavedSummaries();
  const [selectedSummary, setSelectedSummary] = useState<any>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const filteredSummaries = savedSummaries.filter(
    (summary) =>
      (summary.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (summary.content || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString()
  }

  const handleContinueChat = (chat: any) => {
    // This function is no longer needed as it was tied to chat history
    // If you want to re-implement chat history, you'd need to pass a loadChat function
    // For now, it's removed as per the new_code.
  }

  const getChatSummary = (messages: any[]) => {
    const userMessages = messages.filter((msg) => msg.type === "user")
    const aiMessages = messages.filter((msg) => msg.type === "ai")
    return {
      userQuestions: userMessages.length,
      aiResponses: aiMessages.length,
      firstQuestion: userMessages[0]?.content || "",
      lastResponse: aiMessages[aiMessages.length - 1]?.content || "",
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Saved Summaries</h2>
              <p className="text-sm text-gray-600">{savedSummaries.length} summaries saved</p>
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search saved summaries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Saved Summaries */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {filteredSummaries.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSummaries.map((summary) => {
                const postId = summary.postId;
                const truncatedPostId = postId && postId.length > 16 ? `${postId.slice(0, 8)}...${postId.slice(-4)}` : postId;
                const handleCopy = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (postId) {
                    navigator.clipboard.writeText(postId);
                    setCopiedPostId(summary.id);
                    setTimeout(() => setCopiedPostId(null), 1200);
                  }
                };
                return (
                  <Card key={summary.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">{summary.title || 'Untitled Summary'}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {summary.content}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Saved {formatTimeAgo(typeof summary.timestamp === 'string' ? summary.timestamp : summary.timestamp.toISOString())}</span>
                                </div>
                                {summary.author && <span>By {summary.author}</span>}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 flex-shrink-0"
                            onClick={() => unsaveSummary(summary.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Post ID at the bottom, truncated, copyable */}
                        {postId && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span className="font-medium">Post ID:</span>
                            <span className="font-mono break-all select-all cursor-pointer px-1 py-0.5 rounded bg-gray-100 hover:bg-gray-200 transition" onClick={handleCopy} title={postId}>
                              {truncatedPostId}
                            </span>
                            <Button size="icon" variant="ghost" className="h-4 w-4 p-0" onClick={handleCopy} tabIndex={-1} aria-label="Copy Post ID">
                              {copiedPostId === summary.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                            </Button>
                            {copiedPostId === summary.id && <span className="text-green-600 ml-1">Copied!</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedSummary(summary)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="line-clamp-2">{summary.title || 'Untitled Summary'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-700">Saved:</span>
                                    <span className="ml-2">{formatTimeAgo(typeof summary.timestamp === 'string' ? summary.timestamp : summary.timestamp.toISOString())}</span>
                                  </div>
                                  {summary.postId && (
                                    <div className="flex flex-col items-center justify-center mt-2 mb-2">
                                      <span className="font-medium text-gray-700 text-xs mb-1">Post ID</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono break-all select-all cursor-pointer px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 transition text-xs text-gray-700" onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(summary.postId || "");
                                          setCopiedPostId(summary.id);
                                          setTimeout(() => setCopiedPostId(null), 1200);
                                        }} title={summary.postId}>
                                          {summary.postId.length > 16 ? `${summary.postId.slice(0, 8)}...${summary.postId.slice(-4)}` : summary.postId}
                                        </span>
                                        <Button size="icon" variant="ghost" className="h-4 w-4 p-0" onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(summary.postId || "");
                                          setCopiedPostId(summary.id);
                                          setTimeout(() => setCopiedPostId(null), 1200);
                                        }} tabIndex={-1} aria-label="Copy Post ID">
                                          {copiedPostId === summary.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                                        </Button>
                                        {copiedPostId === summary.id && <span className="text-green-600 ml-1 text-xs"></span>}
                                      </div>
                                    </div>
                                  )}
                                  {summary.author && (
                                    <div>
                                      <span className="font-medium text-gray-700">Author:</span>
                                      <span className="ml-2">{summary.author}</span>
                                    </div>
                                  )}
                                  {summary.originalTitle && (
                                    <div>
                                      <span className="font-medium text-gray-700">Original Title:</span>
                                      <span className="ml-2">{summary.originalTitle}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                <p className="text-base text-gray-900 whitespace-pre-line">{summary.content}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved summaries</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? "No summaries match your search." : "Save your favorite summaries to access them later."}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
