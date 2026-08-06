/**
 * @deprecated Depuis la migration vers Supabase Auth, les mots de passe sont
 * gérés exclusivement par Supabase (`auth.users.encrypted_password`).
 *
 * Ces fonctions ne sont plus utilisées par l'application. Elles sont
 * conservées uniquement pour la migration des comptes historiques (les
 * hachages bcrypt `$2b$` existants sont directement importables dans
 * Supabase — voir `drizzle/postgres/0002_supabase_auth_migration.sql`).
 *
 * Ne pas réintroduire de vérification de mot de passe côté application.
 */
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
