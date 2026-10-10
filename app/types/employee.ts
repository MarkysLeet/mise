export interface TutanakEmployee {
  id: string;
  full_name: string;
  role_title: string;
  department_outlet: string;
}

export interface TutanakTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
}

export interface WorkspaceType {
  name?: string;
  hotel_name?: string;
  drive_folder_id?: string;
}
