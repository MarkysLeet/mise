-- Add hotel_name column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workspaces' AND column_name='hotel_name') THEN
        ALTER TABLE workspaces ADD COLUMN hotel_name TEXT;
    END IF;
END $$;
