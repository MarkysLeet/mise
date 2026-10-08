"use client";

import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncModal } from "@/components/SyncModal";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      toast.error(error);
    }

    const sync = searchParams.get("sync");
    if (sync === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsModalOpen(true);
    }
  }, [searchParams]);

  async function handleConnect() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google");
      if (!res.ok) {
        throw new Error("Bağlantı URL'si alınamadı.");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Geçersiz yanıt alındı.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Google Drive'a bağlanırken bir hata oluştu. Lütfen tekrar deneyin.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="mb-8 flex flex-col items-center justify-center gap-3">
        <img src="/logo.svg" alt="Mise Logo" className="h-16 w-16" />
        <h1 className="text-5xl font-bold text-slate-900 tracking-wide" style={{ fontFamily: "var(--font-sans), 'Playfair Display', serif" }}>Mise</h1>
      </div>
      <Card className="w-full max-w-lg border-stone-200 shadow-sm">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight text-stone-900">Google Drive Bağlantısı</CardTitle>
          <CardDescription className="text-stone-500 mt-2">
            Tutanakların ve operasyonel belgelerin kendi Google Drive hesabınızda otomatik olarak oluşturulması için hesabınızı bağlayın.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-8 px-8">
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Bağlanıyor...
              </>
            ) : (
              "Google Drive'ı Bağla"
            )}
          </Button>
        </CardContent>
      </Card>

      {isModalOpen && (
        <SyncModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={() => {
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-50/50"><Loader2 className="h-8 w-8 animate-spin text-stone-500" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}
