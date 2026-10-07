import { Users, AlertCircle, Clock, FileText, CalendarOff, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MissingEmployeesSheet } from "./components/MissingEmployeesSheet";
import { FutureTerminationsPopover } from "./components/FutureTerminationsPopover";
import { getDashboardTotalFazlaMesai } from "@/actions/fazla_mesai";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8">Oturum açmanız gerekiyor.</div>;
  }

  // Get profile and workspace
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, workspaces(*)")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.workspaces) {
    return <div className="p-8">Çalışma alanı bulunamadı.</div>;
  }

  const workspace = profile.workspaces;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();
  const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

  // Fetch employees
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("workspace_id", workspace.id);

  // Calculate active employees based on today
  const todayForStats = new Date();
  todayForStats.setHours(0, 0, 0, 0);

  // Active employees are strictly those with NO termination date
  const activeEmployees = employees?.filter(e => !e.termination_date) || [];

  // Future terminations are employees with termination_date >= today
  const futureTerminations = employees?.filter(e => {
    if (!e.termination_date) return false;
    const termDate = new Date(e.termination_date);
    termDate.setHours(0, 0, 0, 0);
    return termDate >= todayForStats;
  }).map(e => ({
    id: e.id,
    full_name: e.full_name,
    role_title: e.role_title,
    termination_date: e.termination_date.split('-').reverse().join('.')
  })) || [];
  // Fetch current month's puantaj entries
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allEntries: any[] = [];
  let hasMore = true;
  let from = 0;
  const pageSize = 1000;

  while (hasMore) {
    const to = from + pageSize - 1;
    const { data: entriesChunk } = await supabase
      .from("puantaj_entries")
      .select("*")
      .eq("workspace_id", workspace.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .range(from, to);

    if (entriesChunk && entriesChunk.length > 0) {
      allEntries = allEntries.concat(entriesChunk);
      if (entriesChunk.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  const todayEntries = allEntries.filter(e => e.date === todayStr);
  const missingEmployeesEntries = todayEntries.filter(e => e.status && e.status !== "" && e.status !== 'X' && e.status !== 'Hİ');
  const onLeaveToday = missingEmployeesEntries.length;
  const totalFazlaMesai = await getDashboardTotalFazlaMesai();
  const missingEmployees = missingEmployeesEntries.map(entry => {
    const emp = employees?.find(e => e.id === entry.employee_id);
    return {
      id: entry.employee_id,
      full_name: emp?.full_name || 'Bilinmeyen Personel',
      role_title: emp?.role_title || '',
      status: entry.status
    };
  });

  // If today isn't fully filled, we can fall back to month stats or just show 0. Let's show today's data as requested.

  const devamsizlikThisMonth = allEntries.filter(e => e.status === 'D');

  // Fetch tutanaks for this month
  const { data: tutanaks } = await supabase
    .from("tutanaks")
    .select("*, profiles(first_name, last_name)")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  // Prepare recent activity timeline (tutanaks + employees)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activityLog: any[] = [];

  if (tutanaks) {
    tutanaks.slice(0, 10).forEach(t => {
      activityLog.push({
        id: t.id,
        type: 'tutanak',
        date: new Date(t.created_at),
        title: "Tutanak Oluşturuldu",
        desc: `Hazırlayan: ${t.profiles?.first_name} ${t.profiles?.last_name}`,
        url: t.document_url
      });
    });
  }

  if (employees) {
    employees.slice(0, 10).forEach(e => {
       if (e.hire_date) {
         activityLog.push({
           id: `hire_${e.id}`,
           type: 'employee_add',
           date: new Date(e.created_at),
           title: "Personel Eklendi",
           desc: `${e.full_name} (${e.role_title || 'Görevsiz'})`,
           url: null
         });
       }
       if (!e.is_active && e.termination_date) {
         activityLog.push({
           id: `term_${e.id}`,
           type: 'employee_term',
           date: new Date(e.termination_date), // Assuming termination date as event date
           title: "Personel Çıkışı",
           desc: `${e.full_name} işten ayrıldı.`,
           url: null
         });
       }
    });
  }

  // Sort activity desc
  activityLog.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivities = activityLog.slice(0, 5);

  const formattedDate = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(now);

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
            <Card className="border-zinc-200 shadow-sm rounded-2xl bg-zinc-50/50 col-span-1">
              <CardHeader className="pb-2">
                <CardDescription className="font-medium flex items-center gap-2 text-zinc-600">
                  <Users className="h-4 w-4" /> Aktif Personel
                </CardDescription>
                <div className="flex flex-col">
                  <CardTitle className="text-3xl font-light text-zinc-900">
                    {activeEmployees.length}
                  </CardTitle>
                  <FutureTerminationsPopover terminations={futureTerminations} />
                </div>
              </CardHeader>
            </Card>
            
            <MissingEmployeesSheet missingEmployees={missingEmployees} onLeaveCount={onLeaveToday}>
              <Card className="border-zinc-200 shadow-sm rounded-2xl bg-zinc-50/50 cursor-pointer hover:bg-zinc-100 transition-colors col-span-1">
                <CardHeader className="pb-2">
                  <CardDescription className="font-medium flex items-center justify-between text-zinc-600">
                    <div className="flex items-center gap-2">
                      <CalendarOff className="h-4 w-4" /> Gelmeyenler
                    </div>
                    <Info className="h-4 w-4 text-zinc-400" />
                  </CardDescription>
                  <CardTitle className="text-3xl font-light text-zinc-900">{onLeaveToday}</CardTitle>
                </CardHeader>
              </Card>
            </MissingEmployeesSheet>

            <Card className="border-zinc-200 shadow-sm rounded-2xl bg-zinc-50/50 col-span-2 lg:col-span-1">
              <CardHeader className="pb-2">
                <CardDescription className="font-medium flex items-center gap-2 text-zinc-600">
                  <AlertCircle className="h-4 w-4" /> Aylık Fazla Mesai
                </CardDescription>
                <CardTitle className="text-3xl font-light text-zinc-900">
                  {totalFazlaMesai} <span className="text-base font-normal text-zinc-500">saat</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-zinc-200 shadow-sm rounded-2xl flex-1 bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-medium text-zinc-900">Hızlı İşlemler</CardTitle>
              <CardDescription>Sık kullanılan operasyonel araçlar</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:gap-4">
              <Link href="/puantaj" className="group flex flex-col gap-2 md:gap-3 p-3 md:p-5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-all duration-200 cursor-pointer">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-medium text-zinc-900">Puantaj Yönetimi</h3>
                  <p className="text-xs md:text-sm text-zinc-500 mt-1">Personel devam durumunu ve vardiyaları yönetin</p>
                </div>
              </Link>
              
              <Link href="/tutanak" className="group flex flex-col gap-2 md:gap-3 p-3 md:p-5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-all duration-200 cursor-pointer">
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-medium text-zinc-900">Yeni Tutanak Oluştur</h3>
                  <p className="text-xs md:text-sm text-zinc-500 mt-1">Devamsızlık veya olay tutanağı hazırlayın</p>
                </div>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 w-full">
          <Card className="border-zinc-200 shadow-sm rounded-2xl flex-1 bg-white w-full overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-medium text-zinc-900">
                <AlertCircle className="h-5 w-5 text-zinc-900" />
                Dikkat Gerektirenler
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {devamsizlikThisMonth.length > 0 ? (
                devamsizlikThisMonth.slice(0, 3).map((d, i) => {
                  const emp = employees?.find(e => e.id === d.employee_id);
                  return (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="flex items-start gap-2 overflow-hidden">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900 truncate">{emp?.full_name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5 break-words line-clamp-2">{d.date} tarihinde Devamsızlık (D) işaretlendi.</p>
                        </div>
                      </div>
                      <Link href="/tutanak" className="self-end">
                        <Button variant="outline" size="sm" className="h-7 text-xs">Tutanak Oluştur</Button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-zinc-500 py-4 text-center">Tüm operasyonel işlemler güncel.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm rounded-2xl bg-white w-full overflow-hidden">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-medium text-zinc-900">Son İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((log, i) => (
                  <div key={i} className="flex gap-3 md:gap-4 group overflow-hidden">
                    <div className="text-xs text-zinc-400 font-mono w-10 md:w-12 pt-0.5 whitespace-nowrap flex-shrink-0">
                      {log.date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="flex-1 pb-4 border-b border-zinc-100 group-last:border-0 group-last:pb-0 min-w-0">
                      {log.url ? (
                         <a href={log.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-zinc-900 hover:underline transition-colors block truncate">
                           {log.title}
                         </a>
                      ) : (
                        <p className="text-sm font-medium text-zinc-900 transition-colors truncate">{log.title}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-0.5 break-words line-clamp-2">{log.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500 py-4 text-center">Henüz işlem bulunmuyor.</div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
