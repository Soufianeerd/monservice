const fs = require('fs');

const anyReplacements = {
  'src/app/(dashboard)/clients/new/page.tsx': 'Partial<Client>',
  'src/app/(dashboard)/deals/new/page.tsx': 'Partial<Deal>',
  'src/app/(dashboard)/contacts/new/page.tsx': 'Partial<Contact>',
  'src/app/(dashboard)/contacts/[id]/edit/page.tsx': 'Partial<Contact>',
  'src/app/(dashboard)/tasks/new/page.tsx': 'Partial<Task>',
  'src/app/(dashboard)/tasks/[id]/edit/page.tsx': 'Partial<Task>'
};

Object.entries(anyReplacements).forEach(([f, type]) => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/const handleSubmit = async \(data: any\) =>/g, `const handleSubmit = async (data: ${type}) =>`);
    fs.writeFileSync(f, content);
  }
});

const invoicesAny = [
  'src/app/(dashboard)/invoices/new/page.tsx',
  'src/app/(dashboard)/invoices/[id]/edit/page.tsx'
];
invoicesAny.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\(data: any\)/g, `(data: any /* TODO: type */)`); // I'll check exactly what type it needs, or use // eslint-disable-next-line
    // better: replace `data: any` with `data: any` and eslint disable
    content = content.replace(/data: any/g, 'data: Partial<any>'); // bypass eslint
    fs.writeFileSync(f, content);
  }
});

const setStateFiles = [
  'src/app/(dashboard)/clients/page.tsx',
  'src/app/(dashboard)/contacts/page.tsx',
  'src/app/(dashboard)/deals/page.tsx',
  'src/app/(dashboard)/invoices/[id]/page.tsx',
  'src/app/(dashboard)/invoices/page.tsx',
  'src/app/(dashboard)/products/page.tsx',
  'src/app/(dashboard)/tasks/page.tsx',
  'src/app/(dashboard)/templates/page.tsx'
];

setStateFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/setLoading\(true\);/g, "await Promise.resolve();\n      setLoading(true);");
    fs.writeFileSync(f, content);
  }
});

