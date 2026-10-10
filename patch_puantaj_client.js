const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

// We need to add a useEffect to open the dossier when dossierEmpId is present
const hookCode = `
  const dossierEmpId = searchParams.get("dossierEmpId");

  useEffect(() => {
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
  }, [dossierEmpId, employees, isDossierOpen]);
`;

// Find a good place to insert this hook, e.g. right after we declare `hasUnsavedDriveChanges` state
const target = "const [hasUnsavedDriveChanges, setHasUnsavedDriveChanges] = useState(false);";

code = code.replace(target, target + '\n' + hookCode);

fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
