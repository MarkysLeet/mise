const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

const hook = `  const dossierEmpId = searchParams.get("dossierEmpId");

  useEffect(() => {
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

code = code.replace(hook, "");

const stateDecls = `  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [dossierEmployee, setDossierEmployee] = useState<any>(null);`;

code = code.replace(stateDecls, stateDecls + '\n\n' + hook);

fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
