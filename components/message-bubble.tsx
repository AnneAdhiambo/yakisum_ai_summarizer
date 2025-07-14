"use client"

import { Bot, User } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button";
import { Repeat, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "./ui/use-toast";

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: string | Date
  title?: string;
  postId?: string;
  author?: string;
}

interface MessageBubbleProps {
  message: Message
  onRepost?: (message: Message) => void;
  onSave?: (message: Message) => void;
  onUnsave?: (message: Message) => void;
  isSaved?: boolean;
}

export function MessageBubble({ message, onRepost, onSave, onUnsave, isSaved }: MessageBubbleProps) {
  const isUser = message.type === "user"

  // Ensure we always have a Date instance to avoid runtime errors
  const date = typeof message.timestamp === "string" ? new Date(message.timestamp) : message.timestamp
  const [clientTime, setClientTime] = useState<string>("");
  useEffect(() => {
    setClientTime(
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [date]);

  const errorMessages = [
    'could not generate summary.',
    'sorry, there was an error summarizing',
    'error:',
    'no summary returned.',
  ];
  const isError =
    !isUser &&
    typeof message.content === 'string' &&
    errorMessages.some(err => message.content.toLowerCase().includes(err));

  const isSummary =
    !isUser &&
    onRepost &&
    message.title &&
    message.title.trim().length > 0 &&
    !/^not found$/i.test(message.title.trim()) &&
    !/^found \d+ articles\.?$/i.test(message.title.trim()) &&
    !/^yakisum assistant$/i.test(message.title.trim()) &&
    !isError;

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser ? "bg-orange-500 text-white" : "bg-white border border-gray-200",
        )}
      >
        {/* Show title and postId for AI messages if present */}
        {!isUser && message.title && (
          <>
            <p className="text-base font-semibold text-gray-900 mb-0.5">{message.title}</p>
           
          </>
        )}
        <p className="text-sm">{message.content}</p>
        {/* Show tags as badges if present */}
        {Array.isArray((message as any).tags) && (message as any).tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(() => {
              const tags = (message as any).tags;
              const maxTags = 4;
              const shown = tags.slice(0, maxTags);
              const hiddenCount = tags.length - maxTags;
              return <>
                {shown.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-orange-600 border-orange-200 bg-orange-50 cursor-pointer select-none"
                    onClick={() => {
                      navigator.clipboard.writeText(`#${tag}`);
                      toast({ title: 'Tag copied', description: `#${tag} copied to clipboard`, variant: 'default' });
                    }}
                  >
                    #{tag}
                  </Badge>
                ))}
                {hiddenCount > 0 && (
                  <Badge variant="outline" className="text-gray-400 border-gray-200 bg-gray-50 cursor-default select-none">
                    +{hiddenCount} more
                  </Badge>
                )}
              </>;
            })()}
          </div>
        )}
        <p className={cn("text-xs mt-1", isUser ? "text-orange-100" : "text-gray-500")}> 
          {clientTime}
        </p>
        {/* Repost button for AI summary messages only (not feedback/greeting) */}
        {isSummary && (
          <div className="flex justify-end mt-2 gap-2">
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              className={isSaved ? "gap-1 bg-red-500 text-white border-red-200 hover:bg-red-600" : "gap-1 border-red-200 text-red-500 hover:bg-red-50"}
              aria-label={isSaved ? "Unsave summary" : "Save summary"}
              onClick={() => (isSaved ? onUnsave?.(message) : onSave?.(message))}
            >
              <Heart className={isSaved ? "fill-current" : ""} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-orange-200 text-orange-600 hover:bg-orange-50"
              onClick={() => onRepost(message)}
            >
              <Repeat className="h-4 w-4" />
              Repost to Yakihonne
            </Button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  )
}
