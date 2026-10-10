export interface ActivityLogEntry {
  id: string;
  type: string;
  date: Date;
  title: string;
  desc: string;
  url: string | null;
}

export interface MissingEmployee {
  id: string;
  full_name: string;
  role_title: string;
  status: string;
}

export interface DashboardEmployee {
  id: string;
  full_name: string;
  role_title: string;
  termination_date: string | null;
  created_at?: string;
  is_active?: boolean;
}
