"use client"

import { CloudOff, Loader2 } from "lucide-react"
import { useSync } from "@/components/providers/SyncProvider"

export function SyncIndicator() {
  const { isOffline, isSyncing } = useSync()

  if (!isOffline && !isSyncing) return null

  return (
    <div className="flex items-center justify-center p-2 rounded-full text-xs font-medium bg-muted/50 border border-border" title={isOffline ? "Offline" : "Senkronize ediliyor"}>
      {isOffline ? (
        <CloudOff className="h-4 w-4 text-muted-foreground" />
      ) : isSyncing ? (
        <Loader2 className="h-4 w-4 text-primary animate-spin" />
      ) : null}
    </div>
  )
}

export function SyncIndicatorWithText() {
  const { isOffline, isSyncing } = useSync()

  if (!isOffline && !isSyncing) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 border border-border">
      {isOffline ? (
        <>
          <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline-block text-muted-foreground">Offline (Değişiklikler kaydediliyor)</span>
          <span className="sm:hidden text-muted-foreground">Offline</span>
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="hidden sm:inline-block text-primary">Senkronize ediliyor...</span>
          <span className="sm:hidden text-primary">Senkronize</span>
        </>
      ) : null}
    </div>
  )
}
