import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation et de vente — MonService",
  description: "Conditions d'utilisation et de vente du service MonService.",
};

/**
 * ⚠️ MODÈLE À FAIRE RELIRE PAR UN JURISTE AVANT COMMERCIALISATION.
 * Un service payant vendu en France impose des CGV conformes au Code de la
 * consommation (droit de rétractation, médiation) lorsqu'il s'adresse aussi
 * à des non-professionnels.
 */
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto prose prose-indigo text-gray-700">
        <h1>Conditions générales d&apos;utilisation et de vente</h1>
        <p className="text-sm text-gray-500">En vigueur au 6 août 2026</p>

        <h2>1. Objet</h2>
        <p>
          Les présentes conditions régissent l&apos;accès et l&apos;utilisation de MonService,
          plateforme de gestion de la relation client et de facturation éditée par
          <strong> [RAISON SOCIALE]</strong>.
        </p>

        <h2>2. Compte</h2>
        <p>
          L&apos;inscription requiert une adresse e-mail valide. Vous êtes responsable de la
          confidentialité de vos identifiants et de toute activité effectuée depuis votre compte.
          Vous vous engagez à fournir des informations exactes et à les tenir à jour.
        </p>

        <h2>3. Abonnements et tarifs</h2>
        <ul>
          <li>Plan Gratuit : 0 € — 50 clients, 10 devis et 10 factures par mois.</li>
          <li>Plan Starter : 29 € TTC par mois — 500 clients, 100 documents par mois.</li>
          <li>Plan Pro : 79 € TTC par mois — usage illimité, 5 utilisateurs.</li>
          <li>Plan Business : 149 € TTC par mois — usage et utilisateurs illimités.</li>
        </ul>
        <p>
          Les abonnements sont sans engagement de durée et reconductibles mensuellement par tacite
          reconduction. Le prélèvement intervient à chaque date anniversaire. Les prix peuvent être
          modifiés moyennant un préavis de 30 jours ; la modification ne s&apos;applique qu&apos;à
          compter de l&apos;échéance suivante.
        </p>

        <h2>4. Droit de rétractation</h2>
        <p>
          Conformément à l&apos;article L221-18 du Code de la consommation, le consommateur dispose
          d&apos;un délai de quatorze jours pour exercer son droit de rétractation. En demandant
          l&apos;accès immédiat au service, vous acceptez que son exécution commence avant la fin
          de ce délai ; vous renoncez alors à ce droit une fois le service pleinement exécuté
          (art. L221-28, 1°).
        </p>
        <p>Ce droit ne s&apos;applique pas aux professionnels agissant à titre professionnel.</p>

        <h2>5. Résiliation</h2>
        <p>
          Vous pouvez résilier à tout moment depuis votre espace. La résiliation prend effet à la
          fin de la période en cours ; aucun remboursement au prorata n&apos;est effectué. Vos
          données restent exportables pendant 30 jours après la résiliation.
        </p>
        <p>
          Nous pouvons suspendre ou résilier un compte en cas de manquement grave aux présentes
          conditions, après notification et mise en demeure restée sans effet pendant 15 jours,
          sauf urgence justifiée par la sécurité du service.
        </p>

        <h2>6. Disponibilité</h2>
        <p>
          Le service est fourni en l&apos;état, sans garantie de disponibilité ininterrompue. Des
          interruptions peuvent survenir pour maintenance ou en raison de facteurs externes.
          Aucun engagement contractuel de niveau de service (SLA) n&apos;est souscrit à ce jour.
        </p>

        <h2>7. Vos données et contenus</h2>
        <p>
          Vous restez propriétaire de l&apos;ensemble des contenus et données que vous saisissez.
          Nous n&apos;acquérons aucun droit de propriété sur ceux-ci et ne les exploitons pas à
          d&apos;autres fins que la fourniture du service.
        </p>

        <h2>8. Signature électronique</h2>
        <p>
          La fonctionnalité de signature constitue une signature électronique simple au sens du
          règlement eIDAS. Sa valeur probante relève de l&apos;appréciation souveraine des
          tribunaux. Pour des engagements à enjeu élevé, le recours à une signature avancée ou
          qualifiée est recommandé.
        </p>

        <h2>9. Responsabilité</h2>
        <p>
          Notre responsabilité est limitée aux dommages directs et prévisibles, dans la limite des
          sommes versées au cours des douze mois précédant le fait générateur. Aucune limitation ne
          s&apos;applique en cas de faute lourde, de dol ou d&apos;atteinte aux personnes.
        </p>

        <h2>10. Droit applicable et litiges</h2>
        <p>
          Les présentes conditions sont régies par le droit français. En cas de litige, une
          solution amiable sera recherchée en priorité. Le consommateur peut recourir gratuitement
          au médiateur de la consommation : <strong>[nom et coordonnées du médiateur]</strong>.
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
