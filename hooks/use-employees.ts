import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "@/actions/puantaj";

export function useEmployees(year: number, month: number) {
  return useQuery({
    queryKey: ["employees", year, month],
    queryFn: () => getEmployees(year, month),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
