"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("global_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fazla_mesai" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["fazla_mesai"] });
          queryClient.invalidateQueries({ queryKey: ["fazla_mesai_total"] });
          queryClient.invalidateQueries({ queryKey: ["sidebar_alerts", "overtime"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "puantaj_entries" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["entries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tutanaks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tutanaks"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  return <>{children}</>;
}
