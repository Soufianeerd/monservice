import sys
import re

for filepath in sys.argv[1:]:
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    task_service_imported = False
    
    for line in lines:
        if 'import { taskService } from \'@/lib/services/task.service\';' in line or 'import { taskService } from "@/lib/services/task.service";' in line:
            if task_service_imported:
                continue
            task_service_imported = True
            
        new_lines.append(line)
        
    with open(filepath, 'w') as f:
        f.write('\n'.join(new_lines))
