import { useQuery } from "@tanstack/react-query";
import { getTutanakFormOptions, getTutanakFiles } from "@/actions/tutanak";

export function useTutanakOptions() {
  return useQuery({
    queryKey: ["tutanak_options"],
    queryFn: () => getTutanakFormOptions(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTutanakFiles() {
  return useQuery({
    queryKey: ["tutanaks"],
    queryFn: () => getTutanakFiles(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
