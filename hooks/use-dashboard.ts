import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/actions/dashboard";

export const DASHBOARD_QUERY_KEY = ["dashboard_data"];

export function useDashboardData() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      return await getDashboardData();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
