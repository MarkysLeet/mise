import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getEmployees, getPuantajEntries, bulkUpsertPuantaj } from "@/actions/puantaj";
import { Database } from "@/types/database";
import { addToQueue } from "@/lib/syncManager";

type Employee = Database["public"]["Tables"]["employees"]["Row"];
type PuantajEntry = Database["public"]["Tables"]["puantaj_entries"]["Row"];

import { getRoles } from "@/actions/settings";

type Role = Database["public"]["Tables"]["roles"]["Row"];

export function usePuantaj(year: number, month: number) {
  const queryClient = useQueryClient();

  const employeesKey = ["employees", year, month];
  const entriesKey = ["entries", year, month];
  const rolesKey = ["roles"];

  const employeesQuery = useQuery({
    queryKey: employeesKey,
    queryFn: () => getEmployees(year, month),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const entriesQuery = useQuery({
    queryKey: entriesKey,
    queryFn: () => getPuantajEntries(year, month),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const rolesQuery = useQuery({
    queryKey: rolesKey,
    queryFn: () => getRoles(),
    staleTime: 5 * 60 * 1000,
  });

  const updateEntryMutation = useMutation({
    mutationFn: async (entries: { employee_id: string; date: string; status: string }[]) => {
      if (!navigator.onLine) {
        // If offline, just queue it and resolve immediately to avoid rejecting the mutation
        await addToQueue("bulkUpsertPuantaj", entries);
        return { error: null }; // Simulate success for optimistic UI
      }
      try {
        const result = await bulkUpsertPuantaj(entries);
        return result;
      } catch (error) {
        // If it's a network error (e.g. TypeError: Failed to fetch), queue it
        if (error instanceof TypeError) {
          await addToQueue("bulkUpsertPuantaj", entries);
          return { error: null }; // Simulate success
        }
        throw error;
      }
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
    roles: rolesQuery.data || [],
    isEmployeesLoading: employeesQuery.isLoading,
    isEntriesLoading: entriesQuery.isLoading,
    isRolesLoading: rolesQuery.isLoading,
    updateEntry: updateEntryMutation.mutate,
    updateEntryAsync: updateEntryMutation.mutateAsync,
    isUpdatingEntry: updateEntryMutation.isPending,
  };
}
