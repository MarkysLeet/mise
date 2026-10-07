"use client"

import { useState } from "react"
import { Search, Bell, User, CloudOff, Loader2 } from "lucide-react"
import { Playfair_Display } from "next/font/google"
import { useSync } from "@/components/providers/SyncProvider"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

const playfair = Playfair_Display({ subsets: ["latin"] })

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex h-14 items-center justify-between px-4 md:px-8">
          {/* Left Side: Mobile Logo */}
          <div className="flex items-center md:hidden">
             <div className="flex shrink-0 items-center gap-2">
                <img src="/logo.svg" alt="Mise Logo" className="h-8 w-8" />
                <h1 className={cn("text-xl font-semibold text-foreground tracking-wide", playfair.className)}>Mise</h1>
             </div>
          </div>

          {/* Right Side: Actions. Pushed to right via ml-auto on desktop if needed, but justify-between handles it if left side is empty on desktop, wait, if left side is hidden, justify-between will put right side on the left. So let's wrap left side in a div that is hidden on md, and on md right side ml-auto. Or just justify-end on md */}
          <div className="flex items-center gap-2 md:ml-auto ml-auto">
            {/* Offline/Sync Indicator */}
            <SyncIndicator />

            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" />}>
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <PopoverHeader className="p-4 border-b border-border">
                  <PopoverTitle>Bildirimler</PopoverTitle>
                </PopoverHeader>
                <div className="flex flex-col">
                  <div className="flex flex-col gap-1 p-4 hover:bg-muted/50 border-b border-border transition-colors">
                    <p className="text-sm font-medium text-foreground">Sultan Ertan günlük mesai limitini aştı (5 saat)</p>
                    <span className="text-xs text-muted-foreground">10 dakika önce</span>
                  </div>
                  <div className="flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium text-foreground">Ümmühani Yılmaz için yeni devamsızlık tutanağı oluşturuldu</p>
                    <span className="text-xs text-muted-foreground">1 saat önce</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile Dummy */}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} showCloseButton={false}>
        <CommandInput placeholder="Personel, belge veya işlem ara..." />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          <CommandGroup heading="Son Aramalar">
            <CommandItem>Ahmet Yılmaz</CommandItem>
            <CommandItem>Ayşe Demir</CommandItem>
            <CommandItem>Puantaj Raporu</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

function SyncIndicator() {
  const { isOffline, isSyncing } = useSync()

  if (!isOffline && !isSyncing) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mr-2 bg-muted/50 border border-border">
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
