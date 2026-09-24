"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyDriveFolder } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await verifyDriveFolder(formData);
      
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Google Drive Bağlantısı</CardTitle>
          <CardDescription>
            Devam etmek için bir Google Drive klasörü oluşturun ve aşağıdaki adımları izleyin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4 rounded-lg bg-secondary/50 p-4 text-sm text-secondary-foreground">
            <h3 className="font-semibold">Nasıl Yapılır?</h3>
            <ol className="list-decimal space-y-2 pl-4">
              <li>Google Drive&apos;da yeni bir klasör oluşturun (örn: &quot;Anex Operasyon - Ön Büro&quot;).</li>
              <li>Klasöre sağ tıklayıp &quot;Paylaş&quot; seçeneğini seçin.</li>
              <li>Şu adrese düzenleyici erişimi verin: <br />
                <code className="mt-1 block rounded bg-background p-1 text-primary">
                  mise-service-account@mise-project.iam.gserviceaccount.com
                </code>
              </li>
              <li>Klasörün linkini kopyalayıp aşağıdaki alana yapıştırın.</li>
            </ol>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderLink">Klasör Linki (veya ID&apos;si)</Label>
              <Input 
                id="folderLink" 
                name="folderLink" 
                placeholder="https://drive.google.com/drive/folders/..." 
                required 
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Doğrulanıyor..." : "Doğrula ve Bağlan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
