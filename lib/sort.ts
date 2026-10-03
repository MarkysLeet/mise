export function sortEmployees<T extends { role_title?: string | null; full_name?: string | null }>(
  employees: T[],
  roles: { title: string; priority: number }[] = []
): T[] {
  // Create a fast lookup map for role priorities (case-insensitive)
  const rolePriorityMap = new Map<string, number>();
  for (const role of roles) {
    if (role.title) {
      rolePriorityMap.set(role.title.toUpperCase().trim(), role.priority);
    }
  }

  return employees.sort((a, b) => {
    const roleA = (a.role_title || "").toUpperCase().trim();
    const roleB = (b.role_title || "").toUpperCase().trim();

    const weightA = rolePriorityMap.has(roleA) ? rolePriorityMap.get(roleA)! : 999;
    const weightB = rolePriorityMap.has(roleB) ? rolePriorityMap.get(roleB)! : 999;

    if (weightA !== weightB) {
      return weightA - weightB;
    }

    const nameA = (a.full_name || "").toUpperCase().trim();
    const nameB = (b.full_name || "").toUpperCase().trim();

    return nameA.localeCompare(nameB, 'tr-TR');
  });
}
