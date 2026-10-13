import re

with open("components/layout/BottomNavBar.tsx", "r") as f:
    content = f.read()

# Add getDashboardData to imports
if "getDashboardData" not in content:
    content = content.replace(
        'import { getFazlaMesaiByDate, getFazlaMesaiTotalByMonth } from "@/actions/fazla_mesai";',
        'import { getFazlaMesaiByDate, getFazlaMesaiTotalByMonth } from "@/actions/fazla_mesai";\nimport { getDashboardData } from "@/actions/dashboard";'
    )

# Add DASHBOARD_QUERY_KEY to imports
if "DASHBOARD_QUERY_KEY" not in content:
    content = content.replace(
        'import { useQueryClient } from "@tanstack/react-query";',
        'import { useQueryClient } from "@tanstack/react-query";\nimport { DASHBOARD_QUERY_KEY } from "@/hooks/use-dashboard";'
    )

# Update handlePrefetch function
prefetch_pattern = r'(if \(href === "/fazla-mesai"\) \{)'
new_prefetch = r'''if (href === "/dashboard") {
      queryClient.prefetchQuery({ queryKey: DASHBOARD_QUERY_KEY, queryFn: () => getDashboardData(), staleTime: 5 * 60 * 1000 });
    } else if (href === "/fazla-mesai") {'''

content = re.sub(prefetch_pattern, new_prefetch, content, count=1)

with open("components/layout/BottomNavBar.tsx", "w") as f:
    f.write(content)
