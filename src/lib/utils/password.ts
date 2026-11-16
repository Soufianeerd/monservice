/**
 * @deprecated Depuis la migration vers Neon Auth, les mots de passe sont
 * gérés exclusivement par le fournisseur Neon Auth.
 *
 * Ces fonctions ne sont plus utilisées par l'application. Elles sont
 * conservées uniquement pour la migration des comptes historiques (les
 * hachages bcrypt `$2b$` existants sont directement importables dans
 * Neon Auth).
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
