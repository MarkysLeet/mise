"use client";

import { useState } from "react";
import { FileText, User, AlertTriangle, Download, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateTutanak } from "@/actions/tutanak";
import Link from "next/link";

export default function TutanakPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessUrl(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await generateTutanak(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.documentUrl) {
        setSuccessUrl(result.documentUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata" || "Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto pb-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tutanak Oluşturucu</h1>
            <p className="text-muted-foreground mt-1">Standart tutanak belgeleri oluşturun ve kaydedin.</p>
          </div>
        </div>
      </header>

      {/* Form Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="pb-6 border-b border-border/50">
            <CardTitle>Olay Detayları</CardTitle>
            <CardDescription>Aşağıdaki formu doldurarak resmi tutanak belgenizi otomatik oluşturun.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 pt-6">
            
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-xl">
                {error}
              </div>
            )}

            {successUrl && (
              <div className="p-4 bg-green-500/10 text-green-700 text-sm rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Belge başarıyla oluşturuldu!</span>
                </div>
                <Link href={successUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" type="button" className="text-green-700 border-green-200 hover:bg-green-50">
                    Doküman Hazır — Aç <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="olayTarihi" className="text-muted-foreground">Olay Tarihi ve Saati</Label>
                <div className="relative">
                  <Input 
                    id="olayTarihi"
                    name="olayTarihi"
                    type="datetime-local"
                    required
                    className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="olayYeri" className="text-muted-foreground">Olay Yeri</Label>
                <div className="relative">
                  <Input 
                    id="olayYeri"
                    name="olayYeri"
                    placeholder="Örn. Ana Restoran, Kat 3"
                    required
                    className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="konu" className="text-muted-foreground">Konu (Tema)</Label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="konu"
                  name="konu"
                  placeholder="Tutanak Konusu"
                  required
                  className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="adSoyad" className="text-muted-foreground">Personel Adı Soyadı</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adSoyad"
                    name="adSoyad"
                    placeholder="Örn. Ahmet Yılmaz"
                    required
                    className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="depPos" className="text-muted-foreground">Departman & Pozisyon</Label>
                <div className="relative">
                  <Input
                    id="depPos"
                    name="depPos"
                    placeholder="Örn. F&B / Garson"
                    required
                    className="h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aciklama" className="text-muted-foreground">Detaylı Açıklama</Label>
              <textarea 
                id="aciklama"
                name="aciklama"
                rows={6}
                required
                placeholder="Lütfen olayı objektif bir şekilde açıklayın..."
                className="w-full p-4 bg-stone-50/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="rounded-xl shadow-sm">
              {isSubmitting ? (
                "Oluşturuluyor..."
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Tutanak Oluştur
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
