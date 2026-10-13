import { useQuery } from "@tanstack/react-query";
import { getFazlaMesaiByDate, getFazlaMesaiTotalByMonth, getOvertimeAlerts } from "@/actions/fazla_mesai";

export function useDailyOvertime(date: string) {
  return useQuery({
    queryKey: ["fazla_mesai", date],
    queryFn: () => getFazlaMesaiByDate(date),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useMonthlyOvertimeTotal(year: number, month: number) {
  return useQuery({
    queryKey: ["fazla_mesai_total", year, month],
    queryFn: () => getFazlaMesaiTotalByMonth(year, month),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useOvertimeAlerts() {
  return useQuery({
    queryKey: ["sidebar_alerts", "overtime"],
    queryFn: () => getOvertimeAlerts(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
