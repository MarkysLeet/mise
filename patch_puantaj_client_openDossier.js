const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

// We need to move the openDossier method declaration above the useEffect so it can be safely used
// Or we can just use setDossierEmployee and setIsDossierOpen directly since they are state setters.

const target = `  useEffect(() => {
    if (dossierEmpId && employees.length > 0) {
      const emp = employees.find(e => e.id === dossierEmpId);
      if (emp && !isDossierOpen) {
        openDossier(emp);

        // Clean up URL
        const params = new URLSearchParams(searchParams);
        params.delete("dossierEmpId");
        router.replace(\`\${pathname}?\${params.toString()}\`);
      }
    }
  }, [dossierEmpId, employees, isDossierOpen]);`;

const replacement = `  useEffect(() => {
    if (dossierEmpId && employees.length > 0) {
      const emp = employees.find(e => e.id === dossierEmpId);
      if (emp && !isDossierOpen) {
        setDossierEmployee(emp);
        setIsDossierOpen(true);

        // Clean up URL
        const params = new URLSearchParams(searchParams);
        params.delete("dossierEmpId");
        router.replace(\`\${pathname}?\${params.toString()}\`);
      }
    }
  }, [dossierEmpId, employees, isDossierOpen, pathname, router, searchParams]);`;

code = code.replace(target, replacement);

fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
