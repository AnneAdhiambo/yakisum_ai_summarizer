import { NextRequest, NextResponse } from "next/server";
import { getSubData } from "@/lib/helpers";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL;



async function geminiSummarize(text: string): Promise<string> {
  if (!GEMINI_API_KEY || !GEMINI_API_URL) {
    console.error("Missing environment variables:", { 
      GEMINI_API_KEY: !!GEMINI_API_KEY, 
      GEMINI_API_URL: !!GEMINI_API_URL 
    });
    return "Error: Missing API configuration. Please check your environment variables.";
  }
  
  const prompt = `Summarize the following content in 3-5 sentences.\n\n${text}`;
  console.log("Making request to Gemini:", { url: GEMINI_API_URL, hasKey: !!GEMINI_API_KEY });
  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  // console log; res
  console.log("Gemini response status:", res.status, res.statusText);
  console.log("Gemini response headers:", Object.fromEntries(res.headers.entries()));
  
  if (res.ok) {
    const data = await res.json();
    console.log("Gemini response data:", data);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    const errorText = await res.text();
    console.log("Gemini error response:", errorText);
    return "Could not generate summary.";
  }
}

function extractArticleInfo(event: any) {
  // NIP-23: extract from tags
  const title = event.tags?.find((tag: any) => tag[0] === 'title')?.[1] || "Untitled";
  const summary = event.tags?.find((tag: any) => tag[0] === 'summary')?.[1] || "";
  const image = event.tags?.find((tag: any) => tag[0] === 'image')?.[1] || "/placeholder.svg";
  const author = event.pubkey;
  const date = new Date((event.created_at || 0) * 1000).toISOString().split('T')[0];
  const url = `https://yakihonne.com/a/${event.id}`;
  // Popularity metrics
  const likes = parseInt(event.tags?.find((tag: any) => tag[0] === 'likes')?.[1] || '0', 10);
  const reposts = parseInt(event.tags?.find((tag: any) => tag[0] === 'reposts')?.[1] || '0', 10);
  const zaps = parseInt(event.tags?.find((tag: any) => tag[0] === 'zaps')?.[1] || '0', 10);
  const replies = parseInt(event.tags?.find((tag: any) => tag[0] === 'replies')?.[1] || '0', 10);
  const popularity = likes + reposts + zaps + replies;
  return {
    id: event.id,
    title,
    author,
    authorName: author?.substring?.(0, 8) || "Unknown",
    timeAgo: date,
    readTime: "1 min",
    excerpt: summary || event.content.slice(0, 200),
    thumbnail: image,
    url,
    content: event.content,
    stats: { likes, reposts, zaps, replies, popularity },
  };
}

// Helper: Use Gemini to extract keywords from a query
async function geminiExtractKeywords(query: string): Promise<string[]> {
  if (!GEMINI_API_KEY || !GEMINI_API_URL) {
    return [];
  }
  const prompt = `Extract the main topics or keywords from this query for searching articles. Return a comma-separated list of keywords.\n\nQuery: ${query}`;
  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (res.ok) {
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Split by comma, trim, filter empty
    return text.split(/,|\n/).map((k: string) => k.trim()).filter(Boolean);
  }
  return [];
}

// Helper: Use Gemini to extract search intent (keywords, category, recency)
async function geminiExtractSearchIntent(query: string): Promise<{ keywords: string[]; category?: string; recency?: string }> {
  if (!GEMINI_API_KEY || !GEMINI_API_URL) {
    return { keywords: [] };
  }
  const prompt = `Extract the main topics, category, and any time filters (like 'recent', 'last week', etc.) from this query for searching articles. Return as JSON:
{
  "keywords": [...],
  "category": "...",
  "recency": "..."
}
Query: ${query}`;
  const res = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (res.ok) {
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    try {
      const parsed = JSON.parse(text);
      return {
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map((k: string) => k.trim()).filter(Boolean) : [],
        category: parsed.category || undefined,
        recency: parsed.recency || undefined,
      };
    } catch {
      // fallback: try to extract keywords as before
      return { keywords: text.split(/,|\n/).map((k: string) => k.trim()).filter(Boolean) };
    }
  }
  return { keywords: [] };
}

export async function POST(req: NextRequest) {
  // Debug environment variables for Vercel
  console.log("Vercel Environment Check:", {
    GEMINI_API_KEY: GEMINI_API_KEY ? "SET" : "NOT SET",
    GEMINI_API_URL: GEMINI_API_URL ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
  });
  
  const body = await req.json();
  const { query, articleId, url } = body;

  // 1. If summarizing a specific article (by articleId or url)
  if (articleId || url) {
    let content = "";
    let title = "Article";
    // Try to use search results if available in body.articles
    let found = null;
    if (body.articles && Array.isArray(body.articles)) {
      found = body.articles.find((a: any) => a.id === articleId || a.url === url);
      if (found) {
        content = found.content || found.excerpt || found.title || "";
        title = found.title || title;
      }
    }
    // If not found, fetch from Nostr by ID (kind 30023, historical)
    if (!found && articleId) {
      // Fetch all historical articles (no since filter)
      const { data: events } = await getSubData([{ kinds: [30023] }], 5000);
      const event = events.find((e: any) => e.id === articleId);
      if (event) {
        content = event.content;
        title = extractArticleInfo(event).title;
      }
    } else if (!found && url) {
      // For web articles: fetch and extract text (not implemented here)
      content = `Content from ${url}`;
      title = url;
    }
    if (!content) {
      return NextResponse.json({
        type: "widget",
        layout: "summary",
        body: {
          title: "Not found",
          summary: "Could not find the article to summarize.",
          articles: [],
        },
      });
    }
    console.log("Gemini input content:", content);
    const summary = await geminiSummarize(content);
    return NextResponse.json({
      type: "widget",
      layout: "summary",
      body: {
        title: `Summary for ${title}`,
        postId: articleId || url || null, // Add postId for faint display
        summary,
        debugContent: content,
        debugRequest: body,
        articles: [],
      },
    });
  }

  // 2. Search flow: return articles, no summaries
  if (query) {
    // Support offset and limit for pagination
    const offset = typeof body.offset === 'number' ? body.offset : 0;
    const limit = typeof body.limit === 'number' ? body.limit : 5;
    // Fetch all historical articles (no since filter)
    const { data: events } = await getSubData([{ kinds: [30023] }], 5000);
    let filtered = events;
    let usedKeywords: string[] = [];
    let usedCategory: string | undefined;
    let usedRecency: string | undefined;
    // Use Gemini to extract search intent
    try {
      const intent = await geminiExtractSearchIntent(query);
      usedKeywords = intent.keywords;
      usedCategory = intent.category;
      usedRecency = intent.recency;
    } catch (e) {
      usedKeywords = [];
    }
    // Filter by keywords
    if (usedKeywords.length > 0) {
      const qwords = usedKeywords.map((k) => k.toLowerCase());
      filtered = filtered.filter((e: any) => {
        const title = e.tags?.find((tag: any) => tag[0] === 'title')?.[1] || "";
        const summary = e.tags?.find((tag: any) => tag[0] === 'summary')?.[1] || "";
        const content = e.content || "";
        return qwords.some((kw) =>
          title.toLowerCase().includes(kw) ||
          summary.toLowerCase().includes(kw) ||
          content.toLowerCase().includes(kw)
        );
      });
    }
    // Filter by category if present
    if (usedCategory) {
      filtered = filtered.filter((e: any) => {
        const category = e.tags?.find((tag: any) => tag[0] === 'category')?.[1]?.toLowerCase() || "";
        return category.includes(usedCategory.toLowerCase());
      });
    }
    // Filter by recency if present (simple: if 'recent', sort by created_at desc)
    if (usedRecency && /recent|today|week|month|new/i.test(usedRecency)) {
      filtered = filtered.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
    }
    // Sort by popularity, fallback to recency
    let articles = filtered
      .map(extractArticleInfo)
      .sort((a, b) => {
        if ((b.stats?.popularity || 0) !== (a.stats?.popularity || 0)) {
          return (b.stats?.popularity || 0) - (a.stats?.popularity || 0);
        }
        // Fallback: recency
        return (b.timeAgo > a.timeAgo ? 1 : -1);
      });
    // Deduplicate by id before slicing for pagination
    const seenIds = new Set();
    articles = articles.filter(article => {
      if (seenIds.has(article.id)) return false;
      seenIds.add(article.id);
      return true;
    });
    const total = articles.length;
    articles = articles.slice(offset, offset + limit);
    if (articles.length === 0) {
      // If the query includes 'trending', 'popular', or 'discussions', return most popular/recent
      articles = events
        .map(extractArticleInfo)
        .sort((a, b) => {
          if ((b.stats?.popularity || 0) !== (a.stats?.popularity || 0)) {
            return (b.stats?.popularity || 0) - (a.stats?.popularity || 0);
          }
          return (b.timeAgo > a.timeAgo ? 1 : -1);
        })
        .slice(0, limit);
    }
    return NextResponse.json({
      type: "widget",
      layout: "summary",
      body: {
        title: `Found ${total} articles.`,
        summary: articles.length > 0
          ? `Showing ${offset + 1}-${offset + articles.length}. Please select any to summarize.`
          : `No direct matches found. Here are some recent or trending articles you might like:`,
        articles,
        total,
        offset,
        limit,
        debugRequest: { query, usedKeywords, usedCategory, usedRecency },
      },
    });
  }

  // 3. If neither, return error
  return NextResponse.json({
    type: "widget",
    layout: "summary",
    body: {
      title: "Invalid request",
      summary: "Please provide a query or an article to summarize.",
      articles: [],
      debugRequest: body,
      debugEnv: {
        GEMINI_API_KEY: GEMINI_API_KEY ? "SET" : "NOT SET",
        GEMINI_API_URL: GEMINI_API_URL ? "SET" : "NOT SET",
        NODE_ENV: process.env.NODE_ENV
      }
    },
  }, { status: 400 });
} 