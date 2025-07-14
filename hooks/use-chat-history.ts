"use client"

import { useState, useEffect } from "react"

// Saved summary type
export interface SavedSummary {
  id: string;
  title?: string;
  content: string;
  timestamp: string | Date;
  postId?: string;
  author?: string;
  originalTitle?: string;
}

export function useSavedSummaries() {
  const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("yakihonne_saved_summaries");
    if (saved) {
      setSavedSummaries(JSON.parse(saved));
    }
  }, []);

  const saveSummary = (summary: SavedSummary) => {
    setSavedSummaries((prev) => {
      const updated = [summary, ...prev.filter((s) => s.id !== summary.id)];
      localStorage.setItem("yakihonne_saved_summaries", JSON.stringify(updated));
      return updated;
    });
  };

  const unsaveSummary = (summaryId: string) => {
    setSavedSummaries((prev) => {
      const updated = prev.filter((s) => s.id !== summaryId);
      localStorage.setItem("yakihonne_saved_summaries", JSON.stringify(updated));
      return updated;
    });
  };

  const isSummarySaved = (summaryId: string) => {
    return savedSummaries.some((s) => s.id === summaryId);
  };

  return {
    savedSummaries,
    saveSummary,
    unsaveSummary,
    isSummarySaved,
  };
}

// Chat history hook for HistorySection and related features
export function useChatHistory() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("yakihonne_chat_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const addToHistory = (chat: any) => {
    setHistory((prev) => {
      const updated = [chat, ...prev.filter((c) => c.id !== chat.id)];
      localStorage.setItem("yakihonne_chat_history", JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromHistory = (chatId: string) => {
    setHistory((prev) => {
      const updated = prev.filter((c) => c.id !== chatId);
      localStorage.setItem("yakihonne_chat_history", JSON.stringify(updated));
      return updated;
    });
  };

  return { history, addToHistory, removeFromHistory };
}
