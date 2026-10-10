#!/bin/bash
# Replaces onClick with onMouseDown in the li element to ensure it fires before the document mousedown event closes the dropdown.
# Also calling e.preventDefault() in onMouseDown to ensure focus isn't moved if not needed, though just onMouseDown works.
sed -i 's/onClick={() => handleSelect(emp)}/onMouseDown={(e) => { e.preventDefault(); handleSelect(emp); }}/' app/\(main\)/puantaj/components/EmployeeAutocomplete.tsx
