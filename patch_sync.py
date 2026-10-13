import re

with open("components/providers/RealtimeSyncProvider.tsx", "r") as f:
    content = f.read()

# Add DASHBOARD_QUERY_KEY to imports
if "DASHBOARD_QUERY_KEY" not in content:
    content = content.replace(
        'import { createClient } from "@/lib/supabase/client";',
        'import { createClient } from "@/lib/supabase/client";\nimport { DASHBOARD_QUERY_KEY } from "@/hooks/use-dashboard";'
    )

# Add invalidation to employees
content = content.replace(
    'queryClient.invalidateQueries({ queryKey: ["employees"] });',
    'queryClient.invalidateQueries({ queryKey: ["employees"] });\n          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });'
)

# Add invalidation to fazla_mesai
content = content.replace(
    'queryClient.invalidateQueries({ queryKey: ["sidebar_alerts", "overtime"] });',
    'queryClient.invalidateQueries({ queryKey: ["sidebar_alerts", "overtime"] });\n          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });'
)

# Add invalidation to puantaj_entries
content = content.replace(
    'queryClient.invalidateQueries({ queryKey: ["entries"] });',
    'queryClient.invalidateQueries({ queryKey: ["entries"] });\n          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });'
)

# Add invalidation to tutanaks
content = content.replace(
    'queryClient.invalidateQueries({ queryKey: ["tutanaks"] });',
    'queryClient.invalidateQueries({ queryKey: ["tutanaks"] });\n          queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });'
)


with open("components/providers/RealtimeSyncProvider.tsx", "w") as f:
    f.write(content)
