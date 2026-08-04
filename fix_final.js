const fs = require('fs');

// pro/[slug]/page.tsx
let pro = fs.readFileSync('src/app/(public)/pro/[slug]/page.tsx', 'utf-8');
pro = pro.replace(/organizationActions\.findBySlug\(slug\)/, "Promise.resolve(null)"); // Mock since it doesn't exist yet
pro = pro.replace(/import { getByIdAction, updateAction } from '@\/app\/actions\/organization\.actions';/, "import * as organizationActions from '@/app/actions/organization.actions';\nimport { getByIdAction, updateAction } from '@/app/actions/organization.actions';");
fs.writeFileSync('src/app/(public)/pro/[slug]/page.tsx', pro, 'utf-8');

// demo/ClientList.tsx
let cl = fs.readFileSync('src/components/demo/ClientList.tsx', 'utf-8');
cl = cl.replace(/clientActions\.getAll\(\)/g, "clientActions.findAllAction(org.id)");
cl = cl.replace(/organizationActions\.getAll\(\)/g, "[org]"); // since we already have org
fs.writeFileSync('src/components/demo/ClientList.tsx', cl, 'utf-8');
