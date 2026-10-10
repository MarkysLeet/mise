const fs = require('fs');
let code = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');

code = 'import { GlobalSearch } from "./GlobalSearch";\n' + code;

const startIdx = code.indexOf('<CommandDialog open={searchOpen}');
const endStr = '</CommandDialog>';
const endIdx = code.indexOf(endStr, startIdx) + endStr.length;

if (startIdx !== -1) {
  code = code.substring(0, startIdx) + '<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />' + code.substring(endIdx);
}

fs.writeFileSync('components/layout/Sidebar.tsx', code);
