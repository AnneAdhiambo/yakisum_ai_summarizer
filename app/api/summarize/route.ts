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
  };
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
    // Fetch all historical articles (no since filter)
    const { data: events } = await getSubData([{ kinds: [30023] }], 5000);
    let filtered = events;
    if (query) {
      const q = query.toLowerCase();
      filtered = events.filter((e: any) => {
        // Search in title, summary, and content
        const title = e.tags?.find((tag: any) => tag[0] === 'title')?.[1] || "";
        const summary = e.tags?.find((tag: any) => tag[0] === 'summary')?.[1] || "";
        return (
          title.toLowerCase().includes(q) ||
          summary.toLowerCase().includes(q) ||
          (e.content || "").toLowerCase().includes(q)
        );
      });
    }
    const articles = filtered.slice(0, 5).map(extractArticleInfo);
    return NextResponse.json({
      type: "widget",
      layout: "summary",
      body: {
        title: `Found ${articles.length} articles for "${query}"`,
        summary: `I found ${articles.length} articles. Please select one to summarize.`,
        articles,
        debugRequest: body,
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