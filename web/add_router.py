with open('src/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add import
if 'useRouter' not in c:
    c = c.replace("import { useSearchParams } from 'next/navigation';", "import { useSearchParams, useRouter } from 'next/navigation';")

# Add const router = useRouter(); inside the component
if 'const router = useRouter();' not in c:
    c = c.replace(
        "export default function DashboardClient({ user }: { user: any }) {",
        "export default function DashboardClient({ user }: { user: any }) {\n  const router = useRouter();"
    )

with open('src/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('Added useRouter to DashboardClient')
