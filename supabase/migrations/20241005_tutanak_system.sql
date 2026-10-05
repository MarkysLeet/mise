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
) RETURNS INTEGER AS $
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
