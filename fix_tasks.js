const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace taskRepository.method() with taskService.method()
  content = content.replace(/taskRepository\./g, 'taskService.');

  // If taskService is used but not imported, fix the imports
  if (content.includes('taskService.') && !content.includes('taskService') && !content.includes('import { taskService }')) {
    // If importing from '@/lib/data', remove taskRepository
    content = content.replace(/import\s+\{([^}]*)taskRepository([^}]*)\}\s+from\s+['"]@\/lib\/data['"];?/g, (match, p1, p2) => {
      const rest = p1 + p2;
      const cleanRest = rest.split(',').map(s => s.trim()).filter(Boolean).join(', ');
      if (cleanRest) {
        return `import { ${cleanRest} } from '@/lib/data';\nimport { taskService } from '@/lib/services/task.service';`;
      } else {
        return `import { taskService } from '@/lib/services/task.service';`;
      }
    });

    // If importing from '@/lib/data/repositories'
    content = content.replace(/import\s+\{([^}]*)taskRepository([^}]*)\}\s+from\s+['"]@\/lib\/data\/repositories['"];?/g, (match, p1, p2) => {
      const rest = p1 + p2;
      const cleanRest = rest.split(',').map(s => s.trim()).filter(Boolean).join(', ');
      if (cleanRest) {
        return `import { ${cleanRest} } from '@/lib/data/repositories';\nimport { taskService } from '@/lib/services/task.service';`;
      } else {
        return `import { taskService } from '@/lib/services/task.service';`;
      }
    });
  } else if (content.includes('taskService.') && original.includes('taskRepository') && content.includes('import { taskService }')) {
      // Just remove taskRepository from the import
      content = content.replace(/,\s*taskRepository\b/, '').replace(/\btaskRepository\s*,\s*/, '');
  }

  // Handle case where taskRepository was imported but not yet replaced properly because of multiple imports
  if (content.includes('taskService') && original.includes('taskRepository') && !content.includes("import { taskService } from '@/lib/services/task.service'")) {
     // add import manually if it's missing
     if (!content.includes('taskService') || !content.match(/import\s+.*taskService/)) {
        const importToAdd = `import { taskService } from '@/lib/services/task.service';\n`;
        content = importToAdd + content;
     }
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
