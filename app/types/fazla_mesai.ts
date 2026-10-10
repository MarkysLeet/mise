export interface FazlaMesaiEntry {
  id: string;
  employee_id: string;
  mesai_date: string;
  hours: number;
  description: string | null;
  employees?: { full_name: string; role_title: string; } | { full_name: string; role_title: string; }[];
}
