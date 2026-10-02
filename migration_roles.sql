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
