"use client";

import { useDashboardData } from "@/hooks/use-dashboard";
import DashboardLoading from "./loading";
import { Users, AlertCircle, Clock, FileText, CalendarOff, Info, CalendarDays, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MissingEmployeesSheet } from "./components/MissingEmployeesSheet";
import { FutureTerminationsPopover } from "./components/FutureTerminationsPopover";
import { ActiveEmployeesDialog } from "./components/ActiveEmployeesDialog";

export function DashboardClient() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (error || !data) {
    return <div className="p-8 text-red-500">Oturum açmanız gerekiyor veya bir hata oluştu.</div>;
  }

  const {
    profile,
    workspace,
    activeEmployees,
    futureTerminations,
    onLeaveToday,
    totalFazlaMesai,
    missingEmployees,
    devamsizlikThisMonth,
    recentActivities,
    employees
  } = data;

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);

  return (
    <div className="flex flex-col gap-4 md:gap-8 h-full max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Kontrol Paneli</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Merhaba, {profile.first_name} {profile.last_name} — {workspace.hotel_group || 'Anex Hotels'} ({workspace.name})</p>
          <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 pb-8">

        {/* Left Column - Main Status */}
        <div className="lg:col-span-8 flex flex-col gap-4 lg:gap-6 w-full">

          {/* Shift Overview Row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            <ActiveEmployeesDialog activeEmployees={activeEmployees}>
              <Card className="border-border/60 shadow-sm rounded-2xl bg-muted/30 col-span-1 cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-200 active:scale-[0.99]">
                <CardHeader className="pb-2">
                  <CardDescription className="font-medium flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Aktif Personel
                    </div>
                    <Info className="h-4 w-4 text-muted-foreground/60" />
                  </CardDescription>
                  <div className="flex flex-col">
                    <CardTitle className="text-3xl font-light text-foreground tabular-nums">
                      {activeEmployees.length}
                    </CardTitle>
                    <FutureTerminationsPopover terminations={futureTerminations} />
                  </div>
                </CardHeader>
              </Card>
            </ActiveEmployeesDialog>

            <MissingEmployeesSheet missingEmployees={missingEmployees} onLeaveCount={onLeaveToday}>
              <Card className="border-border/60 shadow-sm rounded-2xl bg-muted/30 cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-200 active:scale-[0.99] col-span-1">
                <CardHeader className="pb-2">
                  <CardDescription className="font-medium flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarOff className="h-4 w-4" /> Gelmeyenler
                    </div>
                    <Info className="h-4 w-4 text-muted-foreground/60" />
                  </CardDescription>
                  <CardTitle className="text-3xl font-light text-foreground tabular-nums">{onLeaveToday}</CardTitle>
                </CardHeader>
              </Card>
            </MissingEmployeesSheet>

            <Card className="border-border/60 shadow-sm rounded-2xl bg-muted/30 col-span-2 lg:col-span-1 cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-200 active:scale-[0.99]">
              <CardHeader className="pb-2">
                <CardDescription className="font-medium flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" /> Aylık Fazla Mesai
                </CardDescription>
                <CardTitle className="text-3xl font-light text-foreground tabular-nums">
                  {totalFazlaMesai} <span className="text-base font-normal text-muted-foreground">saat</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-border/60 shadow-sm rounded-2xl flex-1 bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-medium text-foreground">Hızlı İşlemler</CardTitle>
              <CardDescription>Sık kullanılan operasyonel araçlar</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Link href="/puantaj" className="group flex flex-col gap-2 md:gap-3 p-3 md:p-5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-all duration-200 active:scale-[0.98] cursor-pointer">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-foreground text-background flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-medium text-foreground">Puantaj Yönetimi</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Personel devam durumunu ve vardiyaları yönetin</p>
                </div>
              </Link>

              <Link href="/tutanak" className="group flex flex-col gap-2 md:gap-3 p-3 md:p-5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-all duration-200 active:scale-[0.98] cursor-pointer">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-foreground text-background flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-medium text-foreground">Yeni Tutanak Oluştur</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Devamsızlık veya olay tutanağı hazırlayın</p>
                </div>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 w-full">
          <Card className="border-border/60 shadow-sm rounded-2xl flex-1 bg-card w-full overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium text-foreground">
                <AlertCircle className="h-5 w-5 text-foreground" />
                Dikkat Gerektirenler
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {devamsizlikThisMonth.length > 0 ? (
                devamsizlikThisMonth.slice(0, 3).map((d, i) => {
                  const emp = employees?.find(e => e.id === d.employee_id);
                  return (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-start gap-2 overflow-hidden">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{emp?.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2">{d.date} tarihinde Devamsızlık (D) işaretlendi.</p>
                        </div>
                      </div>
                      <Link href="/tutanak" className="self-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs">Tutanak Oluştur</Button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center"><div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5"><CheckCircle2 className="h-5 w-5" /></div><p className="text-sm font-medium text-foreground">Dikkat gerektiren durum yok</p><p className="text-xs text-muted-foreground mt-0.5">Tüm personel devam durumu güncel.</p></div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm rounded-2xl bg-card w-full overflow-hidden">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium text-foreground">Son İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((log, i) => (
                  <div key={i} className="flex gap-3 md:gap-4 group overflow-hidden">
                    <div className="text-xs text-muted-foreground/60 font-mono w-10 md:w-12 pt-0.5 whitespace-nowrap flex-shrink-0">
                      {log.date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="flex-1 pb-4 border-b border-border/50 group-last:border-0 group-last:pb-0 min-w-0">
                      {log.url ? (
                         <a href={log.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:underline transition-colors block truncate">
                           {log.title}
                         </a>
                      ) : (
                        <p className="text-sm font-medium text-foreground transition-colors truncate">{log.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2">{log.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center"><Clock className="h-5 w-5 text-muted-foreground/60 mb-2" /><p className="text-sm font-medium text-foreground">Henüz kayıtlı işlem yok</p></div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
