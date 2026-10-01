export const ROLE_HIERARCHY: Record<string, number> = {
  "YİYECEK İÇECEK MÜDÜRÜ": 1,
  "YİYECEK İÇECEK MÜDÜR YARDIMCISI": 2,
  "RESTAURANT ŞEFİ": 3,
  "BAR ŞEFİ": 3,
  "RESTAURANT ŞEFİ / BAR ŞEFİ": 3,
  "HEAD WAİTER": 4,
  "KAPTAN": 5,
  "GARSON": 6,
  "BARMEN": 6,
  "GARSON / BARMEN": 6,
  "KOMİ - F&B": 7,
  "KARŞILAMA GÖREVLİSİ (HOSTESS)": 8,
  "HOSTESS": 8
};

export function sortEmployees<T extends { role_title?: string | null; full_name?: string | null }>(
  employees: T[]
): T[] {
  return employees.sort((a, b) => {
    const roleA = (a.role_title || "").toUpperCase().trim();
    const roleB = (b.role_title || "").toUpperCase().trim();

    const weightA = ROLE_HIERARCHY[roleA] || 999;
    const weightB = ROLE_HIERARCHY[roleB] || 999;

    if (weightA !== weightB) {
      return weightA - weightB;
    }

    const nameA = (a.full_name || "").toUpperCase().trim();
    const nameB = (b.full_name || "").toUpperCase().trim();

    return nameA.localeCompare(nameB, 'tr-TR');
  });
}
