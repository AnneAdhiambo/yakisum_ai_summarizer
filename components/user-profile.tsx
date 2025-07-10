"use client"

import { useState } from "react"
import { Wifi, WifiOff, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function UserProfile() {
  const [isConnected, setIsConnected] = useState(true)
  const [copied, setCopied] = useState(false)

  // Mock user data - in real app this would come from Nostr
  const user = {
    name: "yakihonne_user",
    publicKey: "npub1xyz...abc123",
    avatar: "/placeholder.svg?height=40&width=40",
  }

  const handleCopyPublicKey = async () => {
    try {
      await navigator.clipboard.writeText(user.publicKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={user.avatar || "/placeholder.svg"}
              alt={user.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
            />
            <div
              className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm sm:text-base">{user.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[120px] sm:max-w-[180px]">
                {user.publicKey}
              </p>
              <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={handleCopyPublicKey}>
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </div>
  )
}
