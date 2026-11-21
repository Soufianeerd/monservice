import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | undefined;

function createAuth(): NeonAuth {
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sessionDataTtl: 60 },
    logLevel: 'silent',
  });
}

/**
 * Créé à la première utilisation, pas au chargement du module : l'hébergeur peut
 * charger le proxy pendant la construction, sans les variables de l'exécution
 * (cas de Netlify, qui échouait sur « cookies.secret » manquant).
 */
export const auth: NeonAuth = new Proxy<NeonAuth>(Object.create(null), {
  get(_target, property) {
    instance ??= createAuth();
    const value: unknown = Reflect.get(instance, property);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
