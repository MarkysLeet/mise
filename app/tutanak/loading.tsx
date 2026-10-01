import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TutanakLoading() {
  return (
    <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto p-8 pb-10">
      {/* Header Skeleton */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <FileText className="h-5 w-5 opacity-50" />
          </div>
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
      </header>

      {/* Form Card Skeleton */}
      <Card className="border-none shadow-sm rounded-2xl">
        <CardHeader className="pb-6 border-b border-border/50">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-[28rem]" />
        </CardHeader>
        <CardContent className="grid gap-8 pt-6">

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>

        </CardContent>
        <CardFooter className="border-t border-border/50 pt-6 flex justify-end">
          <Skeleton className="h-10 w-40 rounded-xl" />
        </CardFooter>
      </Card>
    </div>
  );
}
