import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 h-full max-w-7xl mx-auto p-8">
      {/* Header Skeleton */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
      </header>

      {/* Bento Grid Skeleton */}
      <div className="grid grid-cols-12 gap-6 pb-8">

        {/* Left Column - Main Status */}
        <div className="col-span-8 flex flex-col gap-6">

          {/* Shift Overview Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-zinc-200 shadow-sm rounded-2xl bg-zinc-50/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 shadow-sm rounded-2xl bg-zinc-50/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardHeader>
            </Card>

            <Card className="border-zinc-200 shadow-sm rounded-2xl bg-zinc-50/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
            </Card>
          </div>

          {/* Quick Actions Skeleton */}
          <Card className="border-zinc-200 shadow-sm rounded-2xl flex-1 bg-white">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-200 bg-zinc-50">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-36 mb-1" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <div className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-200 bg-zinc-50">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Alerts & Activity */}
        <div className="col-span-4 flex flex-col gap-6">
          <Card className="border-zinc-200 shadow-sm rounded-2xl flex-1 bg-white">
            <CardHeader className="pb-4">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <div className="flex items-start gap-2">
                    <Skeleton className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" />
                    <div className="w-full flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-28 self-end mt-1" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm rounded-2xl bg-white">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-3 w-10 mt-1" />
                  <div className="flex-1 pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-full" />
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
