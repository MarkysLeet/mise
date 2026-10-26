import re

with open("app/(main)/puantaj/PuantajClient.tsx", "r") as f:
    content = f.read()

# 1. Import undoTerminateEmployee
content = content.replace("terminateEmployee, deleteEmployee", "terminateEmployee, undoTerminateEmployee, deleteEmployee")

# 2. Add state variables
state_vars = """
  const [isUndoTerminateOpen, setIsUndoTerminateOpen] = useState(false);
  const [employeeToUndoTerminate, setEmployeeToUndoTerminate] = useState<any>(null);
"""
if "const [employeeToTerminate, setEmployeeToTerminate] = useState<any>(null);" in content:
    content = content.replace("const [employeeToTerminate, setEmployeeToTerminate] = useState<any>(null);", "const [employeeToTerminate, setEmployeeToTerminate] = useState<any>(null);\n" + state_vars)

# 3. Add handleUndoTerminate function definition
undo_handler = """
  const handleUndoTerminateModal = (emp: any) => {
    setEmployeeToUndoTerminate(emp);
    setIsUndoTerminateOpen(true);
  };

  const submitUndoTerminate = async () => {
    if (!employeeToUndoTerminate) return;
    try {
      const res = await undoTerminateEmployee(employeeToUndoTerminate.id);
      if (!res?.success) throw new Error(res.error || "İşlem başarısız");
      toast.success("İş çıkışı iptal edildi");
      setIsUndoTerminateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };
"""
if "// Import from Sheets" in content:
    content = content.replace("// Import from Sheets", undo_handler + "\n  // Import from Sheets")

# 4. Pass handleUndoTerminateModal to DesktopPuantajTable
content = content.replace("setEmployeeToTerminate={setEmployeeToTerminate}", "setEmployeeToTerminate={setEmployeeToTerminate}\n        handleUndoTerminate={handleUndoTerminateModal}")

# 5. Add Undo Terminate Modal JSX
undo_modal = """
      {/* Undo Terminate Modal */}
      <Dialog open={isUndoTerminateOpen} onOpenChange={setIsUndoTerminateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İş Çıkışını İptal Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{employeeToUndoTerminate?.full_name}</span> adlı personelin iş çıkışını iptal etmek istediğinize emin misiniz?
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Bu işlem personeli tekrar aktif duruma getirecektir.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUndoTerminateOpen(false)}>İptal</Button>
            <Button variant="default" onClick={submitUndoTerminate}>Onayla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""
if "{/* Delete Modal */}" in content:
    content = content.replace("{/* Delete Modal */}", undo_modal + "\n      {/* Delete Modal */}")

with open("app/(main)/puantaj/PuantajClient.tsx", "w") as f:
    f.write(content)

print("Patched PuantajClient.tsx")
