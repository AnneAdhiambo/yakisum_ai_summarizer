import { NextRequest, NextResponse } from "next/server";
import { getSubData } from "@/lib/helpers";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY 
const GEMINI_API_URL = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

async function geminiSummarize(text: string): Promise<string> {
  const prompt = `Summarize the following content in 3-5 sentences.\n\n${text}`;
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (res.ok) {
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
  return "Could not generate summary.";
}

function extractArticleInfo(event: any) {
  const content = event.content || "";
  const lines = content.split('\n');
  let title = lines.find((line: string) => line.trim().startsWith('#')) || lines[0] || "Untitled";
  title = title.replace(/^#+\s*/, '').trim();
  let description = lines.slice(1).join(' ').slice(0, 200);
  if (!description) description = content.slice(0, 200);
  const author = event.pubkey;
  const date = new Date((event.created_at || 0) * 1000).toISOString().split('T')[0];
  const url = `https://yakihonne.com/notes/nevent1qq${event.id}`;
  return {
    id: event.id,
    title,
    author,
    authorName: author?.substring?.(0, 8) || "Unknown",
    timeAgo: date,
    readTime: "1 min",
    excerpt: description,
    thumbnail: "/placeholder.svg",
    url,
  };
}

export async function POST(req: NextRequest) {
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
    // If not found, fetch from Nostr by ID
    if (!found && articleId) {
      const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7;
      const { data: events } = await getSubData([{ kinds: [1], since }], 1000);
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
        summary,
        debugContent: content,
        debugRequest: body,
        articles: [],
      },
    });
  }

  // 2. Search flow: return articles, no summaries
  if (query) {
    const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7;
    const { data: events } = await getSubData([{ kinds: [1], since }], 1000);
    let filtered = events;
    if (query) {
      const q = query.toLowerCase();
      filtered = events.filter((e: any) => e.content.toLowerCase().includes(q));
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
    },
  }, { status: 400 });
} 