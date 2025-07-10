"use client"

import { Clock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Article {
  id: string
  title: string
  author: string
  excerpt: string
  readTime: string
  thumbnail: string
}

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <img
            src={article.thumbnail || "/placeholder.svg"}
            alt={article.title}
            className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">{article.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{article.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{article.author}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{article.readTime}</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-600">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
