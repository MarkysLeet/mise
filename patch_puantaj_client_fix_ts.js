const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

code = code.replace(/setHasUnsavedDriveChanges\(true\);\n/g, '');
code = code.replace(/setHasUnsavedDriveChanges\(true\);/g, '');

fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
