import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getEmployees, getPuantajEntries, bulkUpsertPuantaj } from "@/actions/puantaj";
import { Database } from "@/types/database";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type PuantajEntry = Database["public"]["Tables"]["puantaj_entries"]["Row"];

export function usePuantaj(year: number, month: number, initialEmployees?: Employee[], initialEntries?: PuantajEntry[]) {
  const queryClient = useQueryClient();

  const employeesKey = ["employees", year, month];
  const entriesKey = ["entries", year, month];

  const employeesQuery = useQuery({
    queryKey: employeesKey,
    queryFn: () => getEmployees(year, month),
    initialData: initialEmployees,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const entriesQuery = useQuery({
    queryKey: entriesKey,
    queryFn: () => getPuantajEntries(year, month),
    initialData: initialEntries,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const updateEntryMutation = useMutation({
    mutationFn: async (entries: { employee_id: string; date: string; status: string }[]) => {
      return bulkUpsertPuantaj(entries);
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: entriesKey });

      // Snapshot the previous value
      const previousEntries = queryClient.getQueryData<PuantajEntry[]>(entriesKey);

      // We do not set optimistic data here because it's already set in the `applyBrush` click handler
      // We just return the snapshot so we can rollback if needed
      return { previousEntries };
    },
    onError: (err, newEntries, context) => {
      // The toast is handled in the UI layer try/catch, we just need to rollback the cache
      if (context?.previousEntries) {
        queryClient.setQueryData(entriesKey, context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entriesKey });
    },
  });

  return {
    employees: employeesQuery.data || [],
    entries: entriesQuery.data || [],
    isEmployeesLoading: employeesQuery.isLoading,
    isEntriesLoading: entriesQuery.isLoading,
    updateEntry: updateEntryMutation.mutate,
    updateEntryAsync: updateEntryMutation.mutateAsync,
    isUpdatingEntry: updateEntryMutation.isPending,
  };
}
