"use client"

import { useState } from "react"
import { Search, Filter, Grid, List, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArticleCard } from "@/components/article-card"

const mockArticles = [
  {
    id: "1",
    title: "Understanding the Nostr Protocol: A Deep Dive",
    author: "Alice Johnson",
    excerpt:
      "Explore the fundamentals of the Nostr protocol and how it's revolutionizing decentralized social media. This comprehensive guide covers everything from basic concepts to advanced implementations.",
    readTime: "12 min read",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Technology",
    publishedAt: "2024-01-15",
    trending: true,
  },
  {
    id: "2",
    title: "The Future of Decentralized Publishing",
    author: "Bob Smith",
    excerpt:
      "How blockchain technology and decentralized protocols are reshaping content creation, distribution, and monetization in the digital age.",
    readTime: "8 min read",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Blockchain",
    publishedAt: "2024-01-14",
    trending: false,
  },
  {
    id: "3",
    title: "Building Resilient Social Networks",
    author: "Carol Davis",
    excerpt:
      "Examining the architecture and design principles behind censorship-resistant social media platforms and their impact on free speech.",
    readTime: "15 min read",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Social Media",
    publishedAt: "2024-01-13",
    trending: true,
  },
  {
    id: "4",
    title: "Cryptographic Foundations of Modern Web",
    author: "David Wilson",
    excerpt:
      "A technical exploration of cryptographic protocols that power secure, decentralized applications and their real-world implementations.",
    readTime: "20 min read",
    thumbnail: "/placeholder.svg?height=120&width=200",
    category: "Cryptography",
    publishedAt: "2024-01-12",
    trending: false,
  },
]

export function ArticlesSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = ["all", "Technology", "Blockchain", "Social Media", "Cryptography"]

  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex-1 flex flex-col">
      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <div className="flex border border-gray-200 rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {category === "all" ? "All Categories" : category}
            </Button>
          ))}
        </div>
      </div>

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">{filteredArticles.length} articles found</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>Trending topics</span>
          </div>
        </div>

        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {filteredArticles.map((article) => (
            <div key={article.id} className="relative">
              {article.trending && <Badge className="absolute top-2 right-2 z-10 bg-orange-500">Trending</Badge>}
              {viewMode === "grid" ? (
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4">
                    <img
                      src={article.thumbnail || "/placeholder.svg"}
                      alt={article.title}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <div className="space-y-2">
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                      <h3 className="font-medium text-gray-900 line-clamp-2">{article.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{article.author}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ArticleCard article={article} />
              )}
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No articles found matching your criteria.</p>
            <Button
              variant="outline"
              className="mt-4 bg-transparent"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
