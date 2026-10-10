export interface SidebarAlert {
  id: string;
  mesai_date: string;
  hours: number;
  employees?: { full_name: string; } | { full_name: string; }[];
}
