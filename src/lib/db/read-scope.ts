import 'server-only';
import { db } from './server';
import { hasActiveTransaction } from './security-context';

/**
 * Exécute les lectures d'une page dans une seule transaction.
 *
 * Toute requête émise par `db` à l'intérieur réutilise la connexion de la
 * transaction (security-context.ts) : un `Promise.all` y part en pipeline, d'où
 * BEGIN + identité + lectures + COMMIT en quelques allers-retours au lieu de
 * cinq par requête. L'identité est posée par la même transaction que d'habitude
 * (vérification de session, contrôle du rôle, set_config local) : RLS et
 * isolation des organisations sont inchangées.
 *
 * Règles :
 * - lectures uniquement (pas d'écriture, pas de `prepareStarterPractice`) ;
 * - résoudre l'identité AVANT d'ouvrir le lot (`requireProfessional()`,
 *   `getSessionContext()`, organisation) : ce sont des promesses partagées par
 *   le cache de requête avec les layouts. Avec une seule connexion dans le pool,
 *   attendre dans le lot une promesse partagée lancée ailleurs, dont la requête
 *   attend la connexion que le lot détient, bloquerait la requête HTTP ;
 * - dans un `Promise.all` interne, aucune fonction ne doit ouvrir sa propre
 *   `db.transaction` (deux SAVEPOINT concurrents sur la même connexion) ;
 * - imbriqué dans une transaction déjà ouverte, le lot s'y exécute tel quel
 *   (pas de SAVEPOINT supplémentaire) ;
 * - tout ce qui est lancé à l'intérieur doit y être attendu ;
 * - une erreur annule le lot entier (ROLLBACK) et remonte telle quelle.
 */
export async function withReadScope<T>(fn: () => Promise<T>): Promise<T> {
  if (hasActiveTransaction()) return fn();
  return db.transaction(() => fn());
}
