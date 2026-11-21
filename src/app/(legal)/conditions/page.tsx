import { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { getPublisher } from '@/lib/legal/publisher';
import { LegalSection } from '@/components/legal/LegalSection';

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation | MonService',
  description: 'Règles d’accès et d’utilisation de MonService, logiciel de gestion pour les professionnels.',
};

const MISSING = 'information en cours de publication';

export default async function ConditionsPage() {
  // Identité de l'éditeur lue à chaque requête (configuration du serveur).
  await connection();
  const publisher = getPublisher();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Conditions générales d’utilisation</h1>
      <p className="text-sm text-gray-600 mb-8">Dernière mise à jour : 22 novembre 2026.</p>

      <div className="bg-white p-8 shadow sm:rounded-lg space-y-10">
        <LegalSection title="1. Objet et éditeur">
          <p>
            Les présentes conditions encadrent l’accès à MonService, logiciel en ligne de gestion (clients, devis, factures,
            agenda, interventions, suivi) destiné aux professionnels. MonService est édité par {publisher.name ?? MISSING}
            {publisher.legalForm ? `, ${publisher.legalForm}` : ''}
            {publisher.address ? `, ${publisher.address}` : ''}
            {publisher.siret ? `, SIRET ${publisher.siret}` : ''}. Contact : {publisher.email ?? MISSING}.
          </p>
          <p>
            En créant un compte, vous acceptez ces conditions, la{' '}
            <Link href="/confidentialite" className="text-indigo-700 underline">politique de confidentialité</Link> et le{' '}
            <Link href="/contrat-de-sous-traitance" className="text-indigo-700 underline">contrat de sous-traitance</Link>, qui en fait partie.
          </p>
        </LegalSection>

        <LegalSection title="2. Qui peut utiliser MonService">
          <p>
            MonService est réservé aux professionnels (entreprises, indépendants, associations) qui l’utilisent pour leur activité.
            Vous déclarez agir à ce titre et disposer du pouvoir d’engager la structure que vous inscrivez.
          </p>
          <p>
            Vous fournissez des informations exactes et les tenez à jour. Vous êtes responsable de la confidentialité de vos
            identifiants et des actions réalisées depuis votre compte et ceux des membres que vous invitez. Signalez sans délai
            toute utilisation non autorisée à {publisher.email ?? MISSING}.
          </p>
        </LegalSection>

        <LegalSection title="3. Prix">
          <p>
            Pendant l’offre de lancement, l’accès à MonService est gratuit. Si une offre payante est introduite, ses prix et
            conditions vous seront communiqués au moins 30 jours avant leur application. Vous pourrez alors la refuser et fermer
            votre compte, après avoir exporté vos données, sans frais.
          </p>
        </LegalSection>

        <LegalSection title="4. Votre utilisation du service">
          <p>Vous vous engagez à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>ne saisir que des données que vous êtes en droit de traiter, en informant vos propres clients comme le prévoit le RGPD ;</li>
            <li>ne pas enregistrer de données de santé relevant de l’hébergement certifié (HDS) : MonService n’est pas un hébergeur certifié ;</li>
            <li>ne pas tenter d’accéder aux données d’une autre organisation, de contourner les mesures de sécurité ni de perturber le service ;</li>
            <li>ne pas utiliser MonService pour envoyer des messages non sollicités ou un contenu illicite.</li>
          </ul>
          <p>
            Vous restez responsable du contenu de vos devis, factures et documents, notamment des mentions légales et fiscales
            qu’ils doivent comporter. MonService vous aide à les produire mais ne remplace pas votre expert-comptable.
            Une facture émise ne peut plus être modifiée ni supprimée dans MonService.
          </p>
        </LegalSection>

        <LegalSection title="5. Disponibilité et assistance">
          <p>
            Nous mettons en œuvre les moyens raisonnables pour que MonService soit accessible en continu et pour sauvegarder vos
            données. Des interruptions peuvent avoir lieu pour maintenance ou en cas d’incident chez nos prestataires ; nous les
            limitons et vous informons des interruptions programmées lorsque c’est possible.
          </p>
          <p>Assistance : {publisher.email ?? MISSING}.</p>
        </LegalSection>

        <LegalSection title="6. Vos données">
          <p>
            Les données que vous saisissez vous appartiennent. Pour vos propres clients, vous êtes responsable de traitement et
            MonService agit comme sous-traitant, dans les conditions du{' '}
            <Link href="/contrat-de-sous-traitance" className="text-indigo-700 underline">contrat de sous-traitance</Link>.
          </p>
          <p>
            Vous pouvez à tout moment télécharger l’ensemble de vos données depuis <strong>Paramètres › Mes données (RGPD)</strong>,
            dans un format réutilisable.
          </p>
        </LegalSection>

        <LegalSection title="7. Propriété intellectuelle">
          <p>
            Le logiciel, son interface et ses contenus restent la propriété de l’éditeur. Vous disposez d’un droit d’utilisation
            personnel, non exclusif et non cessible, pour la durée de votre compte et pour les besoins de votre activité.
          </p>
        </LegalSection>

        <LegalSection title="8. Responsabilité">
          <p>
            L’éditeur est tenu d’une obligation de moyens. Il ne répond pas des dommages indirects (perte de chiffre d’affaires,
            de clientèle ou d’opportunité), ni des conséquences d’une utilisation non conforme à ces conditions. Pendant l’offre
            gratuite, sa responsabilité est limitée, dans la mesure permise par la loi, aux dommages directs prouvés.
            Ces limites ne s’appliquent pas en cas de faute lourde ou intentionnelle.
          </p>
        </LegalSection>

        <LegalSection title="9. Durée, fermeture et suspension">
          <p>
            Le contrat est conclu pour une durée indéterminée. Vous pouvez fermer votre compte à tout moment depuis{' '}
            <strong>Paramètres › Mes données (RGPD)</strong>. Les factures émises sont conservées 10 ans comme l’exige le Code de
            commerce ; le reste est supprimé ou anonymisé.
          </p>
          <p>
            En cas de manquement grave à ces conditions (atteinte à la sécurité, contenu illicite, fraude), l’éditeur peut
            suspendre l’accès après vous avoir avertis, ou immédiatement si la sécurité du service ou d’autres utilisateurs
            l’exige. Vous pourrez récupérer vos données sauf obstacle légal.
          </p>
        </LegalSection>

        <LegalSection title="10. Modification des conditions">
          <p>
            Toute modification importante vous est annoncée au moins 30 jours avant son entrée en vigueur. Si vous ne l’acceptez
            pas, vous pouvez fermer votre compte avant cette date.
          </p>
        </LegalSection>

        <LegalSection title="11. Droit applicable et litiges">
          <p>
            Ces conditions sont soumises au droit français. En cas de différend, nous cherchons d’abord une solution amiable :
            écrivez à {publisher.email ?? MISSING}. À défaut d’accord dans un délai de 30 jours, le litige entre professionnels
            est porté devant les tribunaux compétents du ressort du siège de l’éditeur.
          </p>
        </LegalSection>
      </div>
    </div>
  );
}
