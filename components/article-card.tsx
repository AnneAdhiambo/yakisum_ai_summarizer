"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Article {
  id: string
  title: string
  author: string
  authorName: string
  timeAgo: string
  readTime: string
  excerpt: string
  thumbnail: string
  url: string
}

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  // Track which tag was copied for visual feedback
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`#${tag}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1200);
  };
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer relative">
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{article.authorName}</span>
              <span className="text-xs text-gray-500">{article.timeAgo}</span>
              <span className="text-xs text-orange-500 ml-2 whitespace-nowrap">{article.readTime.toLowerCase().includes('read') ? article.readTime : `${article.readTime} read`}</span>
            </div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 leading-tight">{article.title}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 line-clamp-2">{article.excerpt}</p>
            {/* Show tags as badges if present */}
            {(() => {
              if (Array.isArray((article as any).tags) && (article as any).tags.length > 0) {
                const tags = (article as any).tags;
                const maxTags = 3;
                const shown = tags.slice(0, maxTags);
                const hiddenCount = tags.length - maxTags;
                return (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {shown.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant={copiedTag === tag ? "default" : "outline"}
                        className={
                          (copiedTag === tag
                            ? "bg-green-500 text-white border-green-500"
                            : "text-orange-600 border-orange-200 bg-orange-50 cursor-pointer select-none"
                          )
                        }
                        onClick={e => handleTagClick(e, tag)}
                      >
                        {copiedTag === tag ? "Copied!" : `#${tag}`}
                      </Badge>
                    ))}
                    {hiddenCount > 0 && (
                      <Badge variant="outline" className="text-gray-400 border-gray-200 bg-gray-50 cursor-default select-none">
                        +{hiddenCount} more
                      </Badge>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <img
            src={article.thumbnail || "/placeholder.svg"}
            alt={article.title}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0 border"
          />
        </div>
        {/* External link icon at bottom right */}
        <div className="absolute bottom-3 right-3">
          <Link href={article.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-5 h-5 text-gray-400 hover:text-orange-500 transition-colors" />
            <span className="sr-only">Open in Yakihonne</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
