"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Puantaj sayfası yüklenirken hata oluştu:", error);
  }, [error]);

  return (
    <div className="flex-1 w-full px-4 py-8 flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Veri yüklenirken bir hata oluştu</h2>
      <p className="text-sm text-slate-500 max-w-md text-center">
        Puantaj verilerini çekerken bir sorun yaşandı. Lütfen sayfayı yenileyin veya tekrar deneyin.
      </p>
      <div className="text-xs text-red-500 bg-red-50 p-2 rounded max-w-md text-center border border-red-100">
        {error.message}
      </div>
      <Button onClick={() => reset()} variant="outline">
        Yeniden Dene
      </Button>
    </div>
  );
}
