import re

with open("app/(main)/puantaj/types.ts", "r") as f:
    content = f.read()

# Add handleUndoTerminate to DesktopPuantajTableProps
if "setEmployeeToTerminate: (employee: Employee | null) => void;" in content:
    # Use regular expression to find where to put the new props
    content = re.sub(
        r'(setEmployeeToTerminate: \(employee: Employee \| null\) => void;)',
        r'\1\n  handleUndoTerminate: (employee: Employee) => void;',
        content
    )

with open("app/(main)/puantaj/types.ts", "w") as f:
    f.write(content)

print("Patched types.ts")
