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
    phone TEXT,
    department_outlet TEXT,
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
    CONSTRAINT puantaj_entries_emp_date_unique UNIQUE(employee_id, date)
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
-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT roles_workspace_title_unique UNIQUE(workspace_id, title)
);

-- Enable RLS for Roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Roles
CREATE POLICY "Enable read access for users in the same workspace" ON roles FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable insert access for users in the same workspace" ON roles FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable update access for users in the same workspace" ON roles FOR UPDATE TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable delete access for users in the same workspace" ON roles FOR DELETE TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);
-- Create tutanak_kayitlari table
CREATE TABLE IF NOT EXISTS tutanak_kayitlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tutanak_no INTEGER NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    incident_date DATE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT tutanak_kayitlari_no_workspace_unique UNIQUE(workspace_id, tutanak_no)
);

-- Enable RLS for tutanak_kayitlari
ALTER TABLE tutanak_kayitlari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users in the same workspace on tutanak_kayitlari" ON tutanak_kayitlari FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable insert access for users in the same workspace on tutanak_kayitlari" ON tutanak_kayitlari FOR INSERT TO authenticated WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

-- Create tutanak_templates table
CREATE TABLE IF NOT EXISTS tutanak_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for tutanak_templates
ALTER TABLE tutanak_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users in the same workspace on tutanak_templates" ON tutanak_templates FOR SELECT TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Enable all access for users in the same workspace on tutanak_templates" ON tutanak_templates FOR ALL TO authenticated USING (
    workspace_id IN (
        SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid()
    )
);

-- RPC for generating next tutanak_no
CREATE OR REPLACE FUNCTION generate_and_insert_tutanak_no(
    p_workspace_id UUID,
    p_employee_id UUID,
    p_incident_date DATE,
    p_created_by UUID
) RETURNS INTEGER AS $$
DECLARE
    next_no INTEGER;
BEGIN
    -- Lock the workspace row for this transaction to prevent concurrent race conditions
    PERFORM id FROM workspaces WHERE id = p_workspace_id FOR UPDATE;

    -- Calculate the next number safely while holding the lock
    SELECT COALESCE(MAX(tutanak_no), 0) + 1 INTO next_no
    FROM tutanak_kayitlari
    WHERE workspace_id = p_workspace_id;

    -- Insert the record immediately within the same transaction to reserve the number
    INSERT INTO tutanak_kayitlari (
        workspace_id,
        tutanak_no,
        employee_id,
        incident_date,
        created_by
    ) VALUES (
        p_workspace_id,
        next_no,
        p_employee_id,
        p_incident_date,
        p_created_by
    );

    RETURN next_no;
END;
$ LANGUAGE plpgsql;

-- Seed base templates for existing workspaces
DO $$
DECLARE
    w_id UUID;
    t_hastalik_haber_verdi TEXT := '{{tarih}} tarihinde F&B departmanında {{gorevi}} olarak calisan {{personel_adi}} isimli personelimiz, hastalik sebebiyle mesaisine gelemeyecegini onceden belirtmis ve gorev yerine gelmemistir.';
    t_hastalik_haber_vermedi TEXT := '{{tarih}} tarihinde F&B departmanında {{gorevi}} olarak calisan {{personel_adi}} isimli personelimiz, hastalik sebebiyle mesaisine gelmemis ve bu durumu onceden yoneticilerine bildirmemistir.';
    t_ozel_sebepler_haber_verdi TEXT := '{{tarih}} tarihinde F&B departmanında {{gorevi}} olarak calisan {{personel_adi}} isimli personelimiz, kisisel mazereti dolayisiyla mesaisine gelemeyecegini onceden belirtmis ve gorev yerine gelmemistir.';
    t_ozel_sebepler_haber_vermedi TEXT := '{{tarih}} tarihinde F&B departmanında {{gorevi}} olarak calisan {{personel_adi}} isimli personelimiz, herhangi bir mazeret bildirmeksizin mesaisine gelmemis ve yoneticilerine onceden haber vermemistir.';
BEGIN
    FOR w_id IN SELECT id FROM workspaces LOOP
        -- Hastalik (Haber Verdi)
        INSERT INTO tutanak_templates (workspace_id, category, title, content)
        VALUES (w_id, 'Devamsizlik', 'Hastalik (Haber Verdi)', t_hastalik_haber_verdi);

        -- Hastalik (Haber Vermedi)
        INSERT INTO tutanak_templates (workspace_id, category, title, content)
        VALUES (w_id, 'Devamsizlik', 'Hastalik (Haber Vermedi)', t_hastalik_haber_vermedi);

        -- Ozel Sebepler (Haber Verdi)
        INSERT INTO tutanak_templates (workspace_id, category, title, content)
        VALUES (w_id, 'Devamsizlik', 'Ozel Sebepler (Haber Verdi)', t_ozel_sebepler_haber_verdi);

        -- Ozel Sebepler (Haber Vermedi)
        INSERT INTO tutanak_templates (workspace_id, category, title, content)
        VALUES (w_id, 'Devamsizlik', 'Ozel Sebepler (Haber Vermedi)', t_ozel_sebepler_haber_vermedi);
    END LOOP;
END;
$$;
