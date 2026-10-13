"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { DASHBOARD_QUERY_KEY } from "@/hooks/use-dashboard";

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
          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fazla_mesai" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["fazla_mesai"] });
          queryClient.invalidateQueries({ queryKey: ["fazla_mesai_total"] });
          queryClient.invalidateQueries({ queryKey: ["sidebar_alerts", "overtime"] });
          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "puantaj_entries" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["entries"] });
          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tutanaks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tutanaks"] });
          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  return <>{children}</>;
}
