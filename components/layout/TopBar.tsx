"use client"

import { useState, useEffect } from "react"
import { Search, Bell, User, CloudOff, Loader2, LogOut, Settings as SettingsIcon, UserCircle } from "lucide-react"
import { Playfair_Display } from "next/font/google"
import { useSync } from "@/components/providers/SyncProvider"
import { cn } from "@/lib/utils"
import { getOvertimeAlerts } from "@/actions/fazla_mesai"
import { logoutUser } from "@/actions/auth"
import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const data = await getOvertimeAlerts()
        setAlerts(data)
      } catch (error) {
        console.error("Failed to fetch alerts:", error)
      } finally {
        setAlertsLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border block md:hidden">
        <div className="flex h-14 items-center justify-between px-4 md:px-8">
          {/* Left Side: Mobile Logo */}
          <div className="flex items-center md:hidden">
             <div className="flex shrink-0 items-center gap-2">
                <Image src="/logo.svg" alt="Mise Logo" width={32} height={32} className="h-8 w-8" />
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
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <PopoverHeader className="p-4 border-b border-border">
                  <PopoverTitle>Bildirimler</PopoverTitle>
                </PopoverHeader>
                <div className="flex flex-col max-h-80 overflow-y-auto">
                  {alertsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : alerts.length > 0 ? (
                    alerts.map((alert) => (
                      <div key={alert.id} className="flex flex-col gap-1 p-4 hover:bg-muted/50 border-b border-border transition-colors last:border-b-0">
                        <p className="text-sm font-medium text-foreground">
                          {alert.mesai_date.split('-').reverse().join('.')} — {alert.employees?.full_name} günlük mesai limitini aştı ({alert.hours} saat)
                        </p>
                        <span className="text-xs text-muted-foreground">Sistem Bildirimi</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Yeni bildirim yok
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" />
              }>
                <User className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem render={
                  <Link href="/settings" className="cursor-pointer w-full flex items-center" />
                }>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem render={
                  <Link href="/settings" className="cursor-pointer w-full flex items-center" />
                }>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Ayarlar</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutUser()} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4 text-red-600" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} showCloseButton={false}>
        <CommandInput placeholder="Personel, belge veya işlem ara..." />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          <CommandGroup heading="Son Aramalar">
            <CommandItem value="ahmet-yilmaz">Ahmet Yılmaz</CommandItem>
            <CommandItem value="ayse-demir">Ayşe Demir</CommandItem>
            <CommandItem value="puantaj-raporu">Puantaj Raporu</CommandItem>
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
