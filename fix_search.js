const fs = require('fs');

// 1. Update utils/search.ts to only export SearchResult (remove globalSearch and service imports)
let utilsSearch = `export interface SearchResult {
  score?: number;
  link?: string;
  id: string;
  type: 'CLIENT' | 'CONTACT' | 'DEAL' | 'TASK' | 'PRODUCT' | 'INVOICE';
  title: string;
  subtitle: string;
  url: string;
}
`;
fs.writeFileSync('src/utils/search.ts', utilsSearch, 'utf-8');

// 2. Update search/page.tsx to use searchAction instead of globalSearch
let searchPage = fs.readFileSync('src/app/(dashboard)/search/page.tsx', 'utf-8');
searchPage = searchPage.replace(/import \{ globalSearch, SearchResult \} from '@\/utils\/search';/, "import { SearchResult } from '@/utils/search';\nimport { searchAction } from '@/app/actions/search.actions';");
searchPage = searchPage.replace(/const data = await globalSearch\(query, user\.organizationId\);/, "const data = await searchAction(query, user.organizationId);");
fs.writeFileSync('src/app/(dashboard)/search/page.tsx', searchPage, 'utf-8');

// 3. Update search.service.ts if it imports SearchResult from utils/search (which it does!)
let searchService = fs.readFileSync('src/lib/services/search.service.ts', 'utf-8');
searchService = searchService.replace(/import \{ taskService \} from '@\/lib\/services\/task\.service';\nimport \{ SearchResult \} from '@\/utils\/search';\nimport \{ clientService \}/, "import { taskService } from '@/lib/services/task.service';\nimport { SearchResult } from '@/utils/search';\nimport { clientService }");
// Actually, it just imports SearchResult from '@/utils/search'. Since utils/search now only exports the type, this is fine!
