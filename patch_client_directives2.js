const fs = require('fs');

function cleanUp(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    code = code.replace('"use client"\n\nimport { GlobalSearch } from "./GlobalSearch";;', '"use client";\n\nimport { GlobalSearch } from "./GlobalSearch";');
    fs.writeFileSync(filePath, code);
}

cleanUp('components/layout/Sidebar.tsx');
cleanUp('components/layout/TopBar.tsx');
