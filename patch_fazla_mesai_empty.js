const fs = require('fs');
const path = './app/(main)/fazla-mesai/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = `<div className="rounded-xl border border-dashed flex flex-col items-center justify-center p-8 text-center text-slate-500">
                      <Clock className="w-8 h-8 mb-2 opacity-50" />
                      <p>Bu tarihte mesai kaydı bulunmuyor.</p>
                    </div>`;

const replace = `<div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 flex flex-col items-center justify-center p-8 text-center">
                      <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center mb-3">
                        <Clock className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Bu tarihte mesai kaydı bulunmuyor</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">Yeni kayıt eklemek için soldaki formu kullanabilirsiniz.</p>
                    </div>`;

content = content.replace(search, replace);
fs.writeFileSync(path, content, 'utf8');
