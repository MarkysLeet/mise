const fs = require('fs');
let code = fs.readFileSync('app/(main)/puantaj/PuantajClient.tsx', 'utf8');

const regexUseEffects = /\/\/ Debounced auto-sync[\s\S]*?\/\/ Navigate Months/g;

code = code.replace(regexUseEffects, '// Navigate Months');
fs.writeFileSync('app/(main)/puantaj/PuantajClient.tsx', code);
