import { redirect } from 'next/navigation';

// S-06 : le registre, les consentements, les demandes et les violations de cette
// rubrique affichaient des exemples fictifs, sans lien avec la base. Tant qu'ils ne
// sont pas branchés sur /api/privacy/*, on renvoie vers l'écran réel d'export et de
// suppression des données.
export default function PrivacyToolsLayout() {
  redirect('/parametres/donnees');
}
