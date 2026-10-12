const fs = require('fs');
const path = './components/ui/sheet.tsx';
let content = fs.readFileSync(path, 'utf8');

const overlaySearch = '"fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"';
const overlayReplace = '"fixed inset-0 z-50 bg-black/40 transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"';
content = content.replace(overlaySearch, overlayReplace);

const contentSearch = '"fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0';
const contentReplace = '"fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-[250ms] ease-out data-ending-style:opacity-0 data-starting-style:opacity-0';
content = content.replace(contentSearch, contentReplace);

fs.writeFileSync(path, content, 'utf8');
