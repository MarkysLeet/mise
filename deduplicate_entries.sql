-- Step 1: Remove physical duplicates from puantaj_entries
-- We will keep the row with the maximum created_at (or id) for each employee_id + date combination
DELETE FROM puantaj_entries a USING (
    SELECT employee_id, date, MAX(created_at) as max_created_at
    FROM puantaj_entries
    GROUP BY employee_id, date
    HAVING COUNT(*) > 1
) b
WHERE a.employee_id = b.employee_id
  AND a.date = b.date
  AND a.created_at < b.max_created_at;

-- Fallback in case of exact same created_at (using internal ctid or id)
DELETE FROM puantaj_entries a USING (
    SELECT MIN(id) as min_id, employee_id, date
    FROM puantaj_entries
    GROUP BY employee_id, date
    HAVING COUNT(*) > 1
) b
WHERE a.employee_id = b.employee_id
  AND a.date = b.date
  AND a.id > b.min_id;

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE puantaj_entries
ADD CONSTRAINT puantaj_entries_emp_date_unique UNIQUE (employee_id, date);
