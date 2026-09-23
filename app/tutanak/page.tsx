"use client";

import { useState } from "react";
import { FileText, Calendar as CalendarIcon, User, AlertTriangle, Save, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function TutanakPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => setIsSubmitting(false), 1000);
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
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tutanak Generator</h1>
            <p className="text-muted-foreground mt-1">Create and log official F&B incident reports.</p>
          </div>
        </div>
      </header>

      {/* Form Card */}
      <Card className="border-none shadow-sm rounded-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="pb-6 border-b border-border/50">
            <CardTitle>Incident Details</CardTitle>
            <CardDescription>Fill out the form below to generate a standardized PDF report.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 pt-6">
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-muted-foreground">Date of Incident</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="date" 
                    type="date" 
                    className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="employee" className="text-muted-foreground">Involved Employee / Guest</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="employee" 
                    placeholder="e.g. Ahmet Yilmaz (Room Service)" 
                    className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-muted-foreground">Incident Type</Label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select 
                  id="type"
                  className="w-full pl-10 h-11 bg-stone-50/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                >
                  <option value="" disabled selected>Select category...</option>
                  <option value="breakage">Equipment Breakage (Glassware, Plates)</option>
                  <option value="guest_complaint">Severe Guest Complaint</option>
                  <option value="no_show">Staff No-Show / Late Arrival</option>
                  <option value="policy">Policy Violation (Hygiene, Uniform)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-muted-foreground">Detailed Description</Label>
              <textarea 
                id="description" 
                rows={6}
                placeholder="Please describe the incident objectively..."
                className="w-full p-4 bg-stone-50/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6 flex justify-between">
            <Button variant="ghost" type="button" className="text-muted-foreground rounded-xl">
              Clear Form
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" type="button" className="rounded-xl border-border shadow-sm">
                <Save className="mr-2 h-4 w-4" /> Save Draft
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl shadow-sm">
                {isSubmitting ? (
                  "Generating..."
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Generate Tutanak
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
