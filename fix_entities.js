const fs = require('fs');

const unescapedFiles = {
  'src/app/(dashboard)/activity/page.tsx': [
    { line: 39, replace: /d'activité/g, with: "d&apos;activité" },
    { line: 52, replace: /Il n'y a aucune activité/g, with: "Il n&apos;y a aucune activité" }
  ],
  'src/app/(dashboard)/search/page.tsx': [
    { line: 56, replace: /pour "/g, with: 'pour &quot;' },
    { line: 56, replace: /"/g, with: '&quot;' }
  ],
  'src/app/(dashboard)/tasks/[id]/page.tsx': [
    { line: 94, replace: /d'échéance/g, with: "d&apos;échéance" }
  ],
  'src/app/(dashboard)/templates/page.tsx': [
    { line: 45, replace: /n'avez pas encore/g, with: "n&apos;avez pas encore" }
  ],
  'src/app/(demo)/demo/page.tsx': [
    { line: 19, replace: /d'accueil/g, with: "d&apos;accueil" }
  ]
};

Object.entries(unescapedFiles).forEach(([f, replaces]) => {
  if (fs.existsSync(f)) {
    let lines = fs.readFileSync(f, 'utf8').split('\n');
    replaces.forEach(r => {
      // line is 1-indexed
      let i = r.line - 1;
      if (lines[i]) {
        lines[i] = lines[i].replace(r.replace, r.with);
      }
    });
    fs.writeFileSync(f, lines.join('\n'));
  }
});
