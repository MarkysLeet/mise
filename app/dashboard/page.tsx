import { Search, Bell, Users, UserMinus, Star, AlertCircle, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Kontrol Paneli</h1>
          <p className="text-muted-foreground mt-1">Günaydın, Vardiya A aktif.</p>
        </div>
        
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search rules, staff, or guests..." 
              className="pl-9 bg-card border-none shadow-sm h-11 rounded-xl"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 border-none shadow-sm bg-card text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6 pb-8">
        
        {/* Left Column - Main Status */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* Shift Overview Row */}
          <div className="grid grid-cols-3 gap-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Active Staff
                </CardDescription>
                <CardTitle className="text-4xl font-light">24<span className="text-lg text-muted-foreground ml-1">/ 28</span></CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardDescription className="font-medium flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-destructive" /> Sick Leaves
                </CardDescription>
                <CardTitle className="text-4xl font-light">2</CardTitle>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl bg-primary/5">
              <CardHeader className="pb-2">
                <CardDescription className="font-medium flex items-center gap-2 text-primary">
                  <Star className="h-4 w-4" /> VIP Arrivals
                </CardDescription>
                <CardTitle className="text-4xl font-light text-primary">12</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-none shadow-sm rounded-2xl flex-1">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used tools for your shift</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Link href="/tutanak" className="group flex flex-col gap-3 p-5 rounded-xl border border-border/50 bg-stone-50/50 hover:bg-card hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Create Tutanak</h3>
                  <p className="text-sm text-muted-foreground mt-1">Log a new incident report</p>
                </div>
              </Link>
              
              <Link href="/puntaj" className="group flex flex-col gap-3 p-5 rounded-xl border border-border/50 bg-stone-50/50 hover:bg-card hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Update Puntaj</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage staff time tracking</p>
                </div>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="col-span-4 flex flex-col gap-6">
          <Card className="border-none shadow-sm rounded-2xl flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Room Service Delay</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Floor 4 orders exceeding 45 mins.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border/50">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Low Inventory: Mint</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Main Bar requested restock.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">View All</Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[
                { time: "10:42", action: "Tutanak created by Ali Y.", desc: "Broken glass incident at Lobby" },
                { time: "09:15", action: "Puntaj updated", desc: "Morning shift finalized" },
                { time: "08:30", action: "Shift Start", desc: "Order Taker desk opened" },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className="text-xs text-muted-foreground font-mono w-10 pt-0.5">{log.time}</div>
                  <div className="flex-1 pb-4 border-b border-border/50 group-last:border-0 group-last:pb-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
