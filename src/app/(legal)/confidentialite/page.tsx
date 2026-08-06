import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — MonService',
  description: 'Comment MonService collecte, utilise et protège vos données personnelles.',
};

/**
 * ⚠️ MODÈLE À FAIRE RELIRE PAR UN JURISTE AVANT COMMERCIALISATION.
 * Les mentions entre crochets doivent être complétées.
 */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-indigo text-gray-700">
        <h1>Politique de confidentialité</h1>
        <p className="text-sm text-gray-500">Dernière mise à jour : 6 août 2026</p>

        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement est <strong>[RAISON SOCIALE]</strong>, [forme juridique] au
          capital de [montant], immatriculée au RCS de [ville] sous le numéro [SIREN], dont le
          siège social est situé [adresse].
        </p>
        <p>
          Contact pour toute question relative aux données personnelles :{' '}
          <strong>[email de contact]</strong>.
        </p>

        <h2>2. Données collectées</h2>
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Données</th>
              <th>Finalité</th>
              <th>Base légale</th>
              <th>Conservation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Compte</td>
              <td>Nom, adresse e-mail, mot de passe (haché)</td>
              <td>Création et gestion du compte</td>
              <td>Exécution du contrat</td>
              <td>Durée du compte + 3 ans</td>
            </tr>
            <tr>
              <td>Organisation</td>
              <td>Raison sociale, adresse, téléphone, secteur</td>
              <td>Établissement des documents commerciaux</td>
              <td>Exécution du contrat</td>
              <td>Durée du compte + 3 ans</td>
            </tr>
            <tr>
              <td>Clients et contacts</td>
              <td>Nom, e-mail, téléphone, adresse</td>
              <td>Fonctionnalité de CRM</td>
              <td>Intérêt légitime de l&apos;utilisateur</td>
              <td>Jusqu&apos;à suppression par l&apos;utilisateur</td>
            </tr>
            <tr>
              <td>Facturation</td>
              <td>Devis, factures, montants, signatures</td>
              <td>Émission et suivi des documents</td>
              <td>Obligation légale</td>
              <td>10 ans (art. L123-22 C. com.)</td>
            </tr>
            <tr>
              <td>Paiement</td>
              <td>Identifiant client Stripe</td>
              <td>Gestion des abonnements</td>
              <td>Exécution du contrat</td>
              <td>Durée du contrat + 10 ans</td>
            </tr>
            <tr>
              <td>Technique</td>
              <td>Journaux de connexion, adresse IP</td>
              <td>Sécurité et preuve de signature</td>
              <td>Intérêt légitime</td>
              <td>12 mois</td>
            </tr>
          </tbody>
        </table>
        <p>
          Aucune donnée bancaire n&apos;est stockée sur nos serveurs : les paiements sont traités
          par Stripe.
        </p>

        <h2>3. Destinataires et sous-traitants</h2>
        <ul>
          <li>
            <strong>Supabase</strong> — hébergement de la base de données et authentification.
            Hébergement dans l&apos;Union européenne [À CONFIRMER selon la région du projet].
          </li>
          <li>
            <strong>Netlify</strong> — hébergement de l&apos;application. Transferts hors UE
            encadrés par les clauses contractuelles types.
          </li>
          <li>
            <strong>Stripe</strong> — traitement des paiements. Transferts encadrés par les
            clauses contractuelles types.
          </li>
          <li>
            <strong>Resend</strong> — acheminement des e-mails transactionnels.
          </li>
        </ul>
        <p>Vos données ne sont ni vendues, ni louées, ni cédées à des fins publicitaires.</p>

        <h2>4. Vos droits</h2>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité de vos données.
        </p>
        <p>
          Les droits d&apos;accès, de portabilité et d&apos;effacement s&apos;exercent directement
          depuis votre espace :{' '}
          <strong>Paramètres → Mes données personnelles</strong>. Pour les autres demandes,
          écrivez à <strong>[email de contact]</strong> ; une réponse vous sera apportée dans un
          délai d&apos;un mois.
        </p>
        <p>
          Vous pouvez introduire une réclamation auprès de la CNIL :{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            www.cnil.fr
          </a>
          .
        </p>

        <h2>5. Sécurité</h2>
        <p>
          Les échanges sont chiffrés en transit (TLS). Les mots de passe sont hachés et ne sont
          jamais stockés en clair. L&apos;accès aux données est cloisonné par organisation, tant au
          niveau applicatif qu&apos;au niveau de la base de données.
        </p>

        <h2>6. Cookies</h2>
        <p>
          MonService utilise uniquement des cookies strictement nécessaires au fonctionnement du
          service (maintien de la session). Ces cookies sont exemptés de consentement préalable.
          Aucun cookie publicitaire ni traceur tiers n&apos;est déposé.
        </p>

        <h2>7. Modifications</h2>
        <p>
          Toute modification substantielle de la présente politique sera notifiée par e-mail au
          moins 30 jours avant son entrée en vigueur.
        </p>

        <div className="mt-8">
          <Link href="/" className="text-indigo-600 hover:underline">
            &larr; Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
