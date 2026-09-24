"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle,  } from "@/components/ui/card";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const result = await registerUser(formData);
      
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/onboarding");
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-stone-50/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
             <h1 className={cn("text-3xl font-semibold text-primary tracking-wide", playfair.className)}>Mise</h1>
          </div>
          <CardTitle className="text-2xl">Kayıt Ol</CardTitle>
          <CardDescription>Operasyon Merkezinizi kurmak için bilgilerinizi girin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input id="firstName" name="firstName" required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input id="lastName" name="lastName" required disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hotelGroup">Otel Grubu</Label>
              <select 
                id="hotelGroup" 
                name="hotelGroup" 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={loading}
              >
                <option value="Anex Hotels">Anex Hotels</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departman</Label>
              <select 
                id="department" 
                name="department" 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={loading}
                defaultValue=""
              >
                <option value="" disabled>Departman Seçin</option>
                <option value="Ön Büro">Ön Büro</option>
                <option value="Kat Hizmetleri">Kat Hizmetleri</option>
                <option value="F&B">F&B</option>
                <option value="Misafir İlişkileri">Misafir İlişkileri</option>
                <option value="Teknik Servis">Teknik Servis</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" required disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" name="password" type="password" required disabled={loading} />
            </div>

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
