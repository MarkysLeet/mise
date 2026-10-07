import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MissingEmployeesSheet({ missingEmployees, onLeaveCount, children }: { missingEmployees: any[], onLeaveCount: number, children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger render={children as React.ReactElement} />
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Gelmeyenler
          </SheetTitle>
          <SheetDescription>
            Bugün işe gelmeyen personel listesi ({onLeaveCount} kişi)
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {missingEmployees.length === 0 ? (
            <p className="text-sm text-zinc-500">Bugün gelmeyen personel bulunmuyor.</p>
          ) : (
            missingEmployees.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-medium text-zinc-600">
                    {emp.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <p className="text-xs text-zinc-500">{emp.role_title || "Belirtilmemiş"}</p>
                  </div>
                </div>
                <Badge variant={emp.status === 'D' ? 'destructive' : 'secondary'}>
                  {emp.status} - {getStatusLabel(emp.status)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    'D': 'Devamsızlık',
    'R': 'Raporlu',
    'Üİ': 'Ücretli İzin',
    'Yİ': 'Yıllık İzin',
  };
  return map[status] || status;
}
