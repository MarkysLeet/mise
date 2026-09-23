import { Clock } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function PuntajPage() {
  return (
    <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto pb-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Puntaj (Time Tracking)</h1>
            <p className="text-muted-foreground mt-1">Manage staff shifts, attendance, and overtime.</p>
          </div>
        </div>
      </header>

      {/* Content Placeholder */}
      <Card className="border-none shadow-sm rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[400px] bg-card text-center">
        <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <CardTitle className="text-xl font-medium mb-2">Puntaj Module Under Construction</CardTitle>
        <CardDescription className="max-w-md">
          This area will contain the timesheet grids and shift management tools. Check back later for updates.
        </CardDescription>
      </Card>
    </div>
  );
}
