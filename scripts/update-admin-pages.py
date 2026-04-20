import os, re, sys

pages = {
    'src/app/admin/users/page.tsx': 'users',
    'src/app/admin/analytics/page.tsx': 'analytics',
    'src/app/admin/emails/page.tsx': 'emails',
    'src/app/admin/settings/page.tsx': 'settings',
    'src/app/admin/refunds/page.tsx': 'refunds',
    'src/app/admin/support/page.tsx': 'support',
    'src/app/admin/notifications/page.tsx': 'notifications',
    'src/app/admin/audit/page.tsx': 'audit',
}

base = '/sessions/cool-gallant-turing/mnt/CashTraka'

for path, section in pages.items():
    full = os.path.join(base, path)
    if not os.path.exists(full):
        print(f'SKIP {path}')
        continue

    with open(full, 'r') as f:
        data = f.read()
    orig = data

    # Replace import
    data = data.replace(
        "import { requireAdmin } from '@/lib/auth';",
        "import { requireAdminSection } from '@/lib/admin-auth';"
    )

    # Replace requireAdmin() calls
    data = re.sub(
        r'const\s+admin\s*=\s*await\s+requireAdmin\(\)',
        f"const admin = await requireAdminSection('{section}')",
        data
    )
    data = re.sub(
        r'await\s+requireAdmin\(\);',
        f"const admin = await requireAdminSection('{section}');",
        data
    )

    # Add adminRole to AdminShell if not already present
    if 'adminRole=' not in data:
        # Try various AdminShell patterns
        data = re.sub(
            r'(<AdminShell[^>]*?)(\s*>)',
            r'\1 adminRole={admin.adminRole}\2',
            data
        )

    # Make sure we have admin variable if page didn't assign it
    # Some pages have: await requireAdmin(); without const
    # We already handle this above

    if data != orig:
        with open(full, 'w') as f:
            f.write(data)
        print(f'UPDATED {path}')
    else:
        print(f'NO CHANGE {path}')

print('Done')
