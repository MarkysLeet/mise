import re

with open("app/(main)/puantaj/components/DesktopPuantajTable.tsx", "r") as f:
    content = f.read()

# Add to EmployeeRowProps
content = content.replace("applyBrush: (empId: string, day: number) => void;", "applyBrush: (empId: string, day: number) => void;\n  handleUndoTerminate: (emp: any) => void;")

# Add to EmployeeRow arguments
content = content.replace("setIsMouseDown, isMouseDown, applyBrush", "setIsMouseDown, isMouseDown, applyBrush, handleUndoTerminate")

# Add dropdown item in EmployeeRow
undo_item = """
            {!emp.is_active && (
              <DropdownMenuItem onClick={() => handleUndoTerminate(emp)}>
                <RotateCcw className="h-4 w-4 mr-2 text-blue-500" /> İş Çıkışını İptal Et
              </DropdownMenuItem>
            )}
"""
if "import { ChevronDown, ChevronRight, Edit2, LogOut, MoreHorizontal, Trash2 } from \"lucide-react\";" in content:
    content = content.replace("import { ChevronDown, ChevronRight, Edit2, LogOut, MoreHorizontal, Trash2 } from \"lucide-react\";", "import { ChevronDown, ChevronRight, Edit2, LogOut, MoreHorizontal, Trash2, RotateCcw } from \"lucide-react\";")
elif "import { ChevronDown, ChevronRight, Edit2, LogOut, MoreHorizontal, Trash2, User } from \"lucide-react\";" in content:
    content = content.replace("import { ChevronDown, ChevronRight, Edit2, LogOut, MoreHorizontal, Trash2, User } from \"lucide-react\";", "import { ChevronDown, ChevronRight, Edit2, LogOut, MoreHorizontal, Trash2, User, RotateCcw } from \"lucide-react\";")
else:
    # generic import replace
    content = re.sub(r'import {([^}]+)} from "lucide-react";', r'import {\1, RotateCcw } from "lucide-react";', content)

content = content.replace("<DropdownMenuSeparator />", undo_item + "            <DropdownMenuSeparator />")

# Pass from DesktopPuantajTable to EmployeeRow
content = content.replace("isMouseDown,\n  applyBrush,\n  openDossier", "isMouseDown,\n  applyBrush,\n  openDossier,\n  handleUndoTerminate")
content = content.replace("isMouseDown={isMouseDown}\n                        applyBrush={applyBrush}", "isMouseDown={isMouseDown}\n                        applyBrush={applyBrush}\n                        handleUndoTerminate={handleUndoTerminate}")


with open("app/(main)/puantaj/components/DesktopPuantajTable.tsx", "w") as f:
    f.write(content)

print("Patched DesktopPuantajTable.tsx")
