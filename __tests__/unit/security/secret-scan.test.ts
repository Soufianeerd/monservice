import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function getAllFiles(dir: string, ext = '.ts'): string[] {
  const results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'dist') continue;
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getAllFiles(fullPath, ext));
    } else if (fullPath.endsWith(ext) || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Secret Scan & Environment Variable Safety (Session 15)', () => {
  const projectRoot = process.cwd();
  const sourceFiles = getAllFiles(join(projectRoot, 'src'));

  it('proves zero forbidden NEXT_PUBLIC secret variables exist in src/', () => {
    const forbiddenPatterns = [
      /NEXT_PUBLIC_.*SERVICE_ROLE/i,
      /NEXT_PUBLIC_.*SECRET/i,
      /NEXT_PUBLIC_.*PRIVATE_KEY/i,
      /NEXT_PUBLIC_.*WEBHOOK_SECRET/i,
      /NEXT_PUBLIC_.*PASSWORD/i,
    ];

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content, `File ${file} contains forbidden NEXT_PUBLIC secret pattern ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('proves zero hardcoded real private keys or service role keys in source code', () => {
    const realKeyPatterns = [
      /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/,
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]{50,}/, // JWT format for real service role key
    ];

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of realKeyPatterns) {
        expect(content, `File ${file} contains potential committed secret`).not.toMatch(pattern);
      }
    }
  });

  it('proves zero security TODOs or unverified admin rights comments in API/Auth scopes', () => {
    const apiFiles = getAllFiles(join(projectRoot, 'src/app/api'));
    const authFiles = getAllFiles(join(projectRoot, 'src/lib/auth'));

    const allChecked = [...apiFiles, ...authFiles];
    for (const file of allChecked) {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toContain('In a real app, verify user has admin rights');
      expect(content).not.toContain('TODO(security)');
    }
  });

  it('proves zero lying casts (as any, as unknown as, @ts-ignore) in src/app/api', () => {
    const apiFiles = getAllFiles(join(projectRoot, 'src/app/api'));
    const forbiddenCasts = [/as any/g, /as unknown as/g, /as never/g, /: any/g, /@ts-ignore/g];

    for (const file of apiFiles) {
      const content = readFileSync(file, 'utf8');
      for (const pattern of forbiddenCasts) {
        expect(content, `File ${file} contains forbidden lying cast: ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
