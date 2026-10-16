"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import * as idb from "idb-keyval";
import { useState, useEffect } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000, // 24 hours (keep cache around)
            refetchOnWindowFocus: true, // we want to fetch new data on background
            refetchOnReconnect: true,
          },
        },
      })
  );

  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const asyncStoragePersister = createAsyncStoragePersister({
        storage: {
          getItem: async (key) => {
            const value = await idb.get(key);
            return value === undefined ? null : value;
          },
          setItem: async (key, value) => {
            await idb.set(key, value);
          },
          removeItem: async (key) => {
            await idb.del(key);
          },
        },
      });
      setPersister(asyncStoragePersister);
    }
  }, []);

  if (!persister) {
    // Render without persister during SSR/hydration to avoid QueryClient errors
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
