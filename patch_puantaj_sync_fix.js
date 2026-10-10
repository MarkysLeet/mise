const fs = require('fs');
let code = fs.readFileSync('actions/puantaj-sync.ts', 'utf8');

// Fix the duplicate const batchRequests: any[] = []; issue
code = code.replace(/const batchRequests: any\[\] = \[\];\s*\n\s*\/\/ 1\. Determine/, '// 1. Determine');

fs.writeFileSync('actions/puantaj-sync.ts', code);
