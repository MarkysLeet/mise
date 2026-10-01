-- Drop tables if they exist
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS workspaces;

-- Create Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Department Name
    hotel_name TEXT,
    hotel_group TEXT DEFAULT 'Anex Hotels',
    drive_folder_id TEXT,
    google_refresh_token TEXT,
    is_onboarded BOOLEAN DEFAULT false,
    initialized_months TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Optional: Create basic RLS policies
-- Note: Adjust policies based on exact requirements later, for now we will grant full access to authenticated users
CREATE POLICY "Enable read access for all authenticated users" ON workspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for all authenticated users" ON workspaces FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for all authenticated users" ON profiles FOR ALL TO authenticated USING (true);

-- Drop tutanaks table if it exists
DROP TABLE IF EXISTS tutanaks;

-- Create Tutanaks table
CREATE TABLE tutanaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Tutanaks
ALTER TABLE tutanaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Tutanaks (read/write only for their own workspace_id)
CREATE POLICY "Enable read access for users in the same workspace" ON tutanaks FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable insert access for users in the same workspace" ON tutanaks FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

-- Drop puantaj_entries and employees tables if they exist
DROP TABLE IF EXISTS puantaj_entries;
DROP TABLE IF EXISTS employees;

-- Create Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    seq_no INTEGER NOT NULL,
    sicil_no TEXT,
    full_name TEXT NOT NULL,
    role_title TEXT,
    hire_date DATE,
    termination_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Puantaj Entries table
CREATE TABLE puantaj_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, date)
);

-- Enable RLS for Employees and Puantaj Entries
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE puantaj_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Employees (read/write only for their own workspace_id)
CREATE POLICY "Enable read access for users in the same workspace" ON employees FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable insert access for users in the same workspace" ON employees FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable update access for users in the same workspace" ON employees FOR UPDATE TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

-- RLS Policies for Puantaj Entries
CREATE POLICY "Enable read access for users in the same workspace" ON puantaj_entries FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable insert access for users in the same workspace" ON puantaj_entries FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable update access for users in the same workspace" ON puantaj_entries FOR UPDATE TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable delete access for users in the same workspace" ON puantaj_entries FOR DELETE TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);
-- Create Notes table
CREATE TABLE IF NOT EXISTS workspace_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Notes
ALTER TABLE workspace_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notes
CREATE POLICY "Enable read access for users in the same workspace" ON workspace_notes FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable insert access for users in the same workspace" ON workspace_notes FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable update access for users in the same workspace" ON workspace_notes FOR UPDATE TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);
