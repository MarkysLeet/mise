"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Cloud, FolderOpen, Plug, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [folderId, setFolderId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    if (!folderId) return;
    setIsConnecting(true);
    // Simulate connection delay
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto pb-10">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage integrations and workspace preferences.</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        {/* Google Drive Integration Section */}
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-stone-50/50 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  Google Drive Integration
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect a Google Drive folder to automatically sync and store generated Tutanak PDFs.
                </CardDescription>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="folder-id" className="text-muted-foreground">Drive Folder ID</Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="folder-id" 
                      placeholder="e.g. 1A2b3C4d5E6f7G8h9I0jKLMNOPQR" 
                      className="pl-10 h-11 bg-stone-50/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      disabled={isConnected || isConnecting}
                    />
                  </div>
                  <Button 
                    onClick={handleConnect} 
                    disabled={!folderId || isConnected || isConnecting}
                    className="h-11 px-6 rounded-xl shadow-sm"
                    variant={isConnected ? "secondary" : "default"}
                  >
                    {isConnecting ? (
                      "Connecting..."
                    ) : isConnected ? (
                      "Connected"
                    ) : (
                      <>
                        <Plug className="mr-2 h-4 w-4" /> Connect
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can find the Folder ID in the URL of your Google Drive folder.
                </p>
              </div>
            </div>
          </CardContent>
          {isConnected && (
            <CardFooter className="border-t border-border/50 bg-stone-50/30 pt-4 flex justify-between">
              <p className="text-sm text-muted-foreground">Syncing is active for this folder.</p>
              <Button variant="ghost" size="sm" onClick={() => setIsConnected(false)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
