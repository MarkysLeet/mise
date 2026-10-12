const fs = require('fs');
const path = './components/settings/RolesTab.tsx';
let content = fs.readFileSync(path, 'utf8');

const search = `<tr>
                    <td colSpan={3} className="p-4 text-center text-muted-foreground">Henüz bir görev eklenmemiş.</td>
                  </tr>`;

const replace = `<tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Briefcase className="w-5 h-5 mb-2 text-muted-foreground/60" />
                        <p>Henüz bir görev eklenmemiş.</p>
                      </div>
                    </td>
                  </tr>`;

content = content.replace(search, replace);

if (!content.includes('Briefcase')) {
  content = content.replace('import { Plus, Trash2, Edit } from "lucide-react";', 'import { Plus, Trash2, Edit, Briefcase } from "lucide-react";');
} else {
  content = content.replace('import { Plus, Trash2, Edit } from "lucide-react";', 'import { Plus, Trash2, Edit, Briefcase } from "lucide-react";');
}

fs.writeFileSync(path, content, 'utf8');
