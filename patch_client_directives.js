const fs = require('fs');

function fixFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.startsWith('import { GlobalSearch } from "./GlobalSearch";\n"use client"')) {
    code = code.replace('import { GlobalSearch } from "./GlobalSearch";\n"use client"', '"use client"\n\nimport { GlobalSearch } from "./GlobalSearch";');
    fs.writeFileSync(filePath, code);
  } else if (code.startsWith('import { GlobalSearch } from "./GlobalSearch";\n"use client";')) {
    code = code.replace('import { GlobalSearch } from "./GlobalSearch";\n"use client";', '"use client";\n\nimport { GlobalSearch } from "./GlobalSearch";');
    fs.writeFileSync(filePath, code);
  }
}

fixFile('components/layout/Sidebar.tsx');
fixFile('components/layout/TopBar.tsx');
