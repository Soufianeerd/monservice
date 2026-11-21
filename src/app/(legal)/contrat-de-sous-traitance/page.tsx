import { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getPublisher } from '@/lib/legal/publisher';
import { LegalSection } from '@/components/legal/LegalSection';

export const metadata: Metadata = {
  title: 'Contrat de sous-traitance (RGPD, art. 28) | MonService',
  description: 'Engagements de MonService lorsqu’il traite les données de vos clients pour votre compte.',
};

const MISSING = 'information en cours de publication';

export default async function ContratSousTraitancePage() {
  await connection();
  const publisher = getPublisher();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contrat de sous-traitance des données</h1>
      <p className="text-sm text-gray-600 mb-8">
        Annexe aux <Link href="/conditions" className="text-indigo-700 underline">conditions d’utilisation</Link>, acceptée à l’inscription.
        Version du 21 novembre 2026.
      </p>

      <div className="bg-white p-8 shadow sm:rounded-lg space-y-10">
        <LegalSection title="1. Parties et objet">
          <p>
            Le professionnel inscrit (le <strong>responsable de traitement</strong>) confie à {publisher.name ?? MISSING} (le
            <strong> sous-traitant</strong>) l’hébergement et le traitement des données qu’il saisit dans MonService sur ses propres
            clients, dans le seul but de lui fournir le service, pendant toute la durée de son abonnement.
          </p>
        </LegalSection>

        <LegalSection title="2. Description du traitement">
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Nature</strong> : hébergement, consultation, mise à jour, génération de documents, envoi d’e-mails sur instruction.</li>
            <li><strong>Personnes concernées</strong> : clients, prospects et contacts du professionnel.</li>
            <li><strong>Données</strong> : identité, coordonnées, documents commerciaux, rendez-vous, notes et mesures de suivi saisies par le professionnel.</li>
            <li><strong>Exclusion</strong> : le service n’est pas certifié HDS ; le professionnel n’y enregistre pas de données de santé relevant de l’article L1111-8 du Code de la santé publique.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Engagements du sous-traitant">
          <ul className="list-disc pl-6 space-y-1">
            <li>Ne traiter les données que sur instruction documentée du professionnel (son utilisation du service vaut instruction), et l’informer si une instruction lui paraît contraire au RGPD.</li>
            <li>Garantir la confidentialité : seules les personnes habilitées y accèdent, sous obligation de confidentialité.</li>
            <li>Mettre en œuvre les mesures de sécurité de l’article 32 : chiffrement des échanges, cloisonnement des organisations en base de données, contrôle des accès, journal des actions sensibles, sauvegardes.</li>
            <li>Ne recourir qu’aux <Link href="/sous-traitants" className="text-indigo-700 underline">sous-traitants ultérieurs listés</Link>, liés par des obligations équivalentes, et informer le professionnel au moins 30 jours avant tout ajout ou remplacement, ce qui lui ouvre un droit d’opposition et de résiliation.</li>
            <li>Encadrer tout transfert hors de l’Union européenne par une garantie de l’article 46 (Data Privacy Framework, clauses contractuelles types).</li>
            <li>Aider le professionnel à répondre aux demandes d’exercice des droits (export des données, suppression) et à réaliser ses analyses d’impact.</li>
            <li>Notifier toute violation de données au professionnel dans les meilleurs délais, et au plus tard 48 heures après en avoir pris connaissance, avec les informations utiles à sa propre notification à la CNIL.</li>
            <li>Au terme du contrat, restituer les données (export) puis les supprimer, sauf obligation légale de conservation.</li>
            <li>Tenir à disposition les informations nécessaires pour démontrer le respect de ces obligations et permettre des audits raisonnables.</li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Engagements du professionnel">
          <ul className="list-disc pl-6 space-y-1">
            <li>Disposer d’une base légale pour les données qu’il saisit et informer ses clients.</li>
            <li>Ne saisir que les données nécessaires à son activité.</li>
            <li>Protéger ses identifiants et gérer les accès de son équipe.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Contact">
          <p>Pour toute question relative à ce contrat : {publisher.email ?? MISSING}.</p>
        </LegalSection>
      </div>
    </div>
  );
}
