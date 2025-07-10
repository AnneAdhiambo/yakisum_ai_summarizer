"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActiveSection = "ai-agent" | "saved" | "history"

interface HeaderProps {
  onMenuClick: () => void
  activeSection: ActiveSection
}

const sectionTitles = {
  "ai-agent": "Yakihonne AI Agent",
  saved: "Saved Chats",
  history: "Chat History",
}

export function Header({ onMenuClick, activeSection }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm sm:text-base">Y</span>
          </div>
          <h1 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">
            {sectionTitles[activeSection]}
          </h1>
        </div>
      </div>
    </header>
  )
}
