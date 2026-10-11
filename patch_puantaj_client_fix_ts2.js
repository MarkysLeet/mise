const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

code = code.replace(/setHasUnsavedDriveChanges\(false\);\n/g, '');
code = code.replace(/setHasUnsavedDriveChanges\(false\);/g, '');

fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
