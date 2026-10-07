"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getQueue, removeFromQueue, incrementRetryCount } from "@/lib/syncManager";
import { bulkUpsertPuantaj } from "@/actions/puantaj"; // Importing action needed for puantaj

interface SyncContextType {
  isOffline: boolean;
  isSyncing: boolean;
  syncPendingMutations: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOffline: false,
  isSyncing: false,
  syncPendingMutations: async () => {},
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      syncPendingMutations();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncPendingMutations = useCallback(async () => {
    if (isSyncing || isOffline) return;

    try {
      setIsSyncing(true);
      const queue = await getQueue();

      if (!queue || queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      for (const item of queue) {
        if (!item.id) continue;

        try {
          if (item.actionName === "bulkUpsertPuantaj") {
            const result = await bulkUpsertPuantaj(item.payload);
            if (result && result.error) {
               console.error("Sync error:", result.error);
               throw new Error(result.error);
            }
          }
          // Remove from queue upon success
          await removeFromQueue(item.id);
        } catch (err) {
          console.error(`Failed to sync item ${item.id}:`, err);
          // If we fail, increment retry count but keep in queue
          await incrementRetryCount(item.id, item);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOffline]);

  return (
    <SyncContext.Provider value={{ isOffline, isSyncing, syncPendingMutations }}>
      {children}
    </SyncContext.Provider>
  );
}
