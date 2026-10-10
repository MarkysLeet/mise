const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

// Remove hasUnsavedDriveChanges usage
code = code.replace(/const \[hasUnsavedDriveChanges, setHasUnsavedDriveChanges\] = useState\(false\);\n/, '');
code = code.replace(/setHasUnsavedDriveChanges\(true\);\n/g, '');

// Clean up stateRef
code = code.replace(/hasUnsavedDriveChanges\n  \}\);/, '  });');
code = code.replace(/, hasUnsavedDriveChanges/, '');
code = code.replace(/hasUnsavedDriveChanges /, '');
code = code.replace(/entries, hasUnsavedDriveChanges/, 'entries');
code = code.replace(/entries, hasUnsavedDriveChanges/, 'entries');


// We need to carefully remove the block with the exact lines
// Or just let regex remove the useEffects

fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
