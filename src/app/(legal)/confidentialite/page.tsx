import { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getPublisher } from '@/lib/legal/publisher';
import { SUBPROCESSORS } from '@/lib/legal/subprocessors';
import { LegalSection } from '@/components/legal/LegalSection';

export const metadata: Metadata = {
  title: 'Politique de confidentialité | MonService',
  description: 'Données traitées par MonService, finalités, durées de conservation, sous-traitants et droits.',
};

const MISSING = 'information en cours de publication';

export default async function ConfidentialitePage() {
  // Identité de l'éditeur lue à chaque requête (configuration du serveur).
  await connection();
  const publisher = getPublisher();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-600 mb-8">Dernière mise à jour : 21 novembre 2026.</p>

      <div className="bg-white p-8 shadow sm:rounded-lg space-y-10">
        <LegalSection title="1. Qui traite vos données">
          <p>
            MonService est édité par {publisher.name ?? MISSING}
            {publisher.address ? `, ${publisher.address}` : ''}. Contact : {publisher.email ?? MISSING}.
          </p>
          <p>
            Pour les données de votre compte (vous, professionnel inscrit), l’éditeur est <strong>responsable de traitement</strong>.
            Pour les données que vous saisissez sur vos propres clients (fiches, devis, factures, rendez-vous, notes), vous êtes
            responsable de traitement et MonService agit comme <strong>sous-traitant</strong> selon le{' '}
            <Link href="/contrat-de-sous-traitance" className="text-indigo-700 underline">contrat de sous-traitance</Link> (article 28 du RGPD).
          </p>
        </LegalSection>

        <LegalSection title="2. Données traitées">
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Compte</strong> : nom, adresse e-mail, téléphone, ville ; mot de passe conservé uniquement sous forme chiffrée par le fournisseur d’authentification.</li>
            <li><strong>Activité</strong> : nom commercial, adresse, SIRET, statut de TVA, coordonnées bancaires affichées sur vos factures.</li>
            <li><strong>Données que vous saisissez</strong> : clients, contacts, devis, factures, paiements, rendez-vous, notes et mesures de suivi.</li>
            <li><strong>Données techniques</strong> : journaux de connexion, adresse IP, navigateur, journal des actions sensibles (exports, suppressions, envois de documents).</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Finalités et bases légales">
          <ul className="list-disc pl-6 space-y-1">
            <li>Fournir le service, votre espace et vos documents : exécution du contrat (art. 6.1.b RGPD).</li>
            <li>Sécuriser les comptes, prévenir la fraude et les abus (limitation des tentatives, journal d’audit) : intérêt légitime (art. 6.1.f).</li>
            <li>Conserver les factures émises : obligation légale (art. 6.1.c).</li>
            <li>Envoyer les e-mails liés au service (codes, documents, rappels) : exécution du contrat.</li>
          </ul>
          <p>Aucune donnée n’est vendue, louée ni utilisée à des fins publicitaires.</p>
        </LegalSection>

        <LegalSection title="4. Durées de conservation">
          <ul className="list-disc pl-6 space-y-1">
            <li>Compte et données d’activité : tant que le compte est actif.</li>
            <li>Après fermeture du compte : profil anonymisé ; les factures émises sont conservées 10 ans (article L123-22 du Code de commerce).</li>
            <li>Journaux de sécurité et d’audit : 12 mois.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Sous-traitants et transferts hors de l’Union européenne">
          <p>La base de données est hébergée dans l’Union européenne (Francfort). Les prestataires techniques sont :</p>
          <ul className="list-disc pl-6 space-y-1">
            {SUBPROCESSORS.map((s) => (
              <li key={s.name}><strong>{s.name}</strong> — {s.service} ({s.location} ; {s.safeguard}).</li>
            ))}
          </ul>
          <p>Détail et mises à jour : <Link href="/sous-traitants" className="text-indigo-700 underline">liste des sous-traitants</Link>.</p>
        </LegalSection>

        <LegalSection title="6. Sécurité">
          <p>
            Échanges chiffrés (HTTPS), cloisonnement des organisations dans la base de données (sécurité au niveau des lignes),
            mots de passe d’au moins 12 caractères, limitation des tentatives de connexion, journal des actions sensibles.
          </p>
          <p>
            MonService n’est pas un hébergeur certifié de données de santé (HDS, article L1111-8 du Code de la santé publique).
            N’y enregistrez pas de diagnostic, de pathologie ni de donnée médicale relevant de cette obligation.
          </p>
        </LegalSection>

        <LegalSection title="7. Vos droits">
          <p>
            Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité.
            Depuis votre espace, <strong>Paramètres › Mes données (RGPD)</strong> permet de télécharger toutes vos données et de fermer votre compte.
            Pour toute autre demande : {publisher.email ?? MISSING}. Réponse sous un mois.
          </p>
          <p>
            Vous pouvez introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr/fr/plaintes" className="text-indigo-700 underline" target="_blank" rel="noopener noreferrer">cnil.fr/fr/plaintes</a>).
          </p>
          <p>Les clients de nos utilisateurs exercent leurs droits auprès du professionnel concerné, que nous assistons.</p>
        </LegalSection>

        <LegalSection title="8. Cookies">
          <p>
            MonService n’utilise que des cookies nécessaires (session de connexion, sécurité). Voir la{' '}
            <Link href="/cookies" className="text-indigo-700 underline">politique cookies</Link>.
          </p>
        </LegalSection>
      </div>
    </div>
  );
}
