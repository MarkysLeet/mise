export interface Employee {
  id: string;
  full_name: string;
  role_title?: string | null;
  phone?: string | null;
  department_outlet?: string | null;
  sicil_no?: string | null;
  hire_date?: string | null;
  is_active?: boolean | null;
  seq_no: number;
}

export interface Entry {
  employee_id: string | null;
  date: string;
  status: string;
}

export interface Status {
  code: string;
  label: string;
  color: string;
}

export interface PendingChanges {
  [employeeId: string]: {
    [day: number]: string;
  };
}

export interface DesktopPuantajTableProps {
  employees: Employee[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roles: any[];
  entries: Entry[];
  currentMonth: number;
  currentYear: number;
  daysArray: number[];
  daysInMonth: number;
  STATUSES: Status[];
  pendingChanges: PendingChanges;
  activeBrush: string | null;
  calculateTotals: (employeeId: string) => Record<string, number>;
  setEmployeeToTerminate: (employee: Employee | null) => void;
  setIsTerminateOpen: (open: boolean) => void;
  setEmployeeToDelete: (employee: Employee | null) => void;
  setIsDeleteOpen: (open: boolean) => void;
  setEmployeeToEdit: (employee: Employee | null) => void;
  setIsEditEmployeeModalOpen: (open: boolean) => void;
  setIsMouseDown: (isDown: boolean) => void;
  isMouseDown: boolean;
  applyBrush: (employeeId: string, day: number) => void;
  openDossier: (employee: Employee) => void;
}

export interface MobilePuantajViewProps {
  employees: Employee[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roles: any[];
  entries: Entry[];
  currentMonth: number;
  currentYear: number;
  daysArray: number[];
  daysInMonth: number;
  STATUSES: Status[];
  calculateTotals: (employeeId: string) => Record<string, number>;
  setEmployeeToTerminate: (employee: Employee | null) => void;
  setIsTerminateOpen: (open: boolean) => void;
  setEmployeeToDelete: (employee: Employee | null) => void;
  setIsDeleteOpen: (open: boolean) => void;
  setEmployeeToEdit: (employee: Employee | null) => void;
  setIsEditEmployeeModalOpen: (open: boolean) => void;
  openDossier: (employee: Employee) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedRoleFilter: string;
  setSelectedRoleFilter: (role: string) => void;
}
