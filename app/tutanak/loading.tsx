import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TutanakLoading() {
  return (
    <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto p-8 pb-10">
      {/* Header Skeleton */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <FileText className="h-5 w-5 opacity-50" />
          </div>
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-48 rounded-xl" />
      </header>

      {/* Grid of Documents Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-border/50 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-10/12 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mt-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
