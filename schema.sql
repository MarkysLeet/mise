-- Drop tables if they exist
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS workspaces;

-- Create Workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Department Name
    hotel_group TEXT DEFAULT 'Anex Hotels',
    drive_folder_id TEXT,
    is_onboarded BOOLEAN DEFAULT false,
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
