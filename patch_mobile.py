import re

with open("app/(main)/puantaj/components/MobilePuantajView.tsx", "r") as f:
    content = f.read()

# Destructure prop
content = content.replace("selectedOutletFilter,\n  setSelectedOutletFilter\n}: MobilePuantajViewProps", "selectedOutletFilter,\n  setSelectedOutletFilter,\n  handleUndoTerminate\n}: MobilePuantajViewProps")

# Add dropdown item
undo_item = """
                                {!emp.is_active && (
                                  <DropdownMenuItem onClick={() => handleUndoTerminate(emp)}>
                                    <RotateCcw className="h-4 w-4 mr-2 text-blue-500" /> İş Çıkışını İptal Et
                                  </DropdownMenuItem>
                                )}
"""

content = re.sub(r'import {([^}]+)} from "lucide-react";', r'import {\1, RotateCcw } from "lucide-react";', content)

content = content.replace("<DropdownMenuSeparator />", undo_item + "                                <DropdownMenuSeparator />")

with open("app/(main)/puantaj/components/MobilePuantajView.tsx", "w") as f:
    f.write(content)

print("Patched MobilePuantajView.tsx")
