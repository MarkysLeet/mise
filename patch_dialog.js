const fs = require('fs');
const path = './components/ui/dialog.tsx';
let content = fs.readFileSync(path, 'utf8');

const overlaySearch = '"fixed inset-0 isolate z-[100] bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"';
const overlayReplace = '"fixed inset-0 isolate z-[100] bg-black/40 duration-200 transition-all supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"';
content = content.replace(overlaySearch, overlayReplace);

const contentSearch = '"fixed top-1/2 left-1/2 z-[100] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"';
const contentReplace = '"fixed top-1/2 left-1/2 z-[100] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-200 ease-out outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"';
content = content.replace(contentSearch, contentReplace);

fs.writeFileSync(path, content, 'utf8');
