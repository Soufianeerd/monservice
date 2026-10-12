import type { WorkspaceType } from '@/lib/workspaces/types';

export interface ControlHelp { title: string; text: string; action: 'read' | 'fill' | 'click' | 'save' }
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Même libellé que le contrôle, y compris dans les anciens formulaires sans htmlFor. */
export function controlLabel(element: HTMLElement): string {
  const explicit = element.getAttribute('data-guide-title') || element.getAttribute('aria-label') || element.getAttribute('title');
  if (explicit) return clean(explicit);
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    const label = element.labels?.[0];
    if (label) return clean(label.textContent || '');
    // Ne remonter que jusqu’au groupe d’un champ ; éviter le libellé d’un champ voisin.
    let parent = element.parentElement;
    for (let depth = 0; parent && depth < 3; depth++, parent = parent.parentElement) {
      if (parent.querySelectorAll('input:not([type="hidden"]), select, textarea').length > 1) break;
      const nearby = parent.querySelector('label');
      if (nearby) return clean(nearby.textContent || '');
    }
    return clean(element.getAttribute('placeholder') || element.getAttribute('name') || 'Champ de saisie');
  }
  return clean(element.textContent || '') || 'Ouvrir les options';
}

// Des explications métier, plutôt que « ceci est un champ ». Le contexte lève les ambiguïtés.
const fields: [RegExp, string][] = [
  [/nom de naissance/i, 'Saisissez le nom figurant sur l’identité de naissance. Exemple fictif : PATIENT TEST. Le nom d’usage peut être renseigné séparément.'],
  [/premier prénom de naissance/i, 'Saisissez le premier prénom de naissance. Pour un exercice fictif, utilisez Martin.'],
  [/tous les prénoms/i, 'Ajoutez les autres prénoms de naissance s’ils sont connus ; ce champ peut rester vide.'],
  [/date de naissance/i, 'Choisissez la date de naissance ; elle permet de distinguer les homonymes. Exemple fictif : 01/01/1990.'],
  [/sexe administratif/i, 'Choisissez la valeur administrative connue. « Inconnu » convient si cette information manque.'],
  [/nom d.usage/i, 'Renseignez le nom utilisé au quotidien uniquement s’il diffère du nom de naissance.'],
  [/prénom d.usage/i, 'Renseignez le prénom utilisé au quotidien s’il diffère du prénom de naissance.'],
  [/code insee/i, 'Il s’agit du code officiel de la commune de naissance, différent du code postal. Laissez vide si vous ne le connaissez pas.'],
  [/commune de naissance/i, 'Indiquez la ville de naissance, par exemple Lyon. Ce champ est facultatif.'],
  [/pays de naissance/i, 'Indiquez le pays de naissance, distinct du pays de résidence.'],
  [/patient|rechercher par nom ou prénom/i, 'Saisissez au moins deux lettres, attendez les résultats, puis cliquez sur le bon patient. Taper son nom seul ne sélectionne pas sa fiche.'],
  [/client|entreprise/i, 'Choisissez le destinataire enregistré dans votre fichier clients. Si la liste est vide, créez d’abord sa fiche dans Clients.'],
  [/lieu de consultation/i, 'Sélectionnez le lieu du rendez-vous. Il doit être créé et associé au praticien dans Lieux et équipe. Son fuseau horaire détermine les heures affichées.'],
  [/praticien/i, 'Choisissez le professionnel qui reçoit le patient. Seuls les praticiens associés au lieu sont proposés pour le rendez-vous.'],
  [/type de séance/i, 'Choisissez le motif : bilan, suivi… Sa durée et ses temps de préparation réservent le temps du praticien ; le tarif se règle séparément.'],
  [/salle/i, 'Sélectionnez une salle du lieu si vous devez en réserver une. Vous pouvez laisser Aucune salle spécifique.'],
  [/fuseau/i, 'Utilisez le fuseau du lieu de consultation, par exemple Europe/Paris. Le planning interprète les heures dans ce fuseau.'],
  [/compte utilisateur associé/i, 'Associez votre compte MonService à votre propre fiche pour accéder au suivi clinique et à la facturation patient. Pour un autre intervenant qui n’utilise pas le logiciel, le champ peut rester vide.'],
  [/principal/i, 'Choisissez le lieu principal de ce praticien parmi ses lieux affectés. Il servira à identifier son lieu habituel.'],
  [/ressource|équipement/i, 'Nommez l’équipement et associez-le au lieu ou à la salle concernée pour le retrouver dans votre structure.'],
  [/disponible à partir/i, 'Choisissez la première date à laquelle le patient souhaite être reçu.'],
  [/fin de validité/i, 'Choisissez la dernière date à laquelle la proposition peut être acceptée.'],
  [/valeur|montant estimé/i, 'Indiquez le montant estimé de l’affaire commerciale. Ce montant sert au pipeline ; il ne crée ni devis ni facture.'],
  [/clôture/i, 'Choisissez la date estimée de conclusion de l’affaire pour suivre votre activité commerciale.'],
  [/mot de passe actuel/i, 'Renseignez votre mot de passe actuel pour confirmer votre identité si ce formulaire le demande.'],
  [/confirmer.*mot de passe|confirmation.*mot de passe/i, 'Saisissez une seconde fois le nouveau mot de passe, à l’identique, avant de valider.'],
  [/nouveau mot de passe/i, 'Choisissez votre nouveau mot de passe, puis recopiez-le dans la confirmation. Le changement prend effet après validation du formulaire sécurisé.'],
  [/message/i, 'Rédigez le texte destiné à votre interlocuteur. Relisez le contenu et le destinataire avant de cliquer sur Envoyer.'],
  [/notes|commentaire|résumé/i, 'Ajoutez les détails utiles au suivi de ce dossier : ce qui a été fait, ce qui reste à faire et les informations nécessaires à la prochaine action.'],
  [/logo/i, 'Facultatif : choisissez une image pour identifier votre activité. La sauvegarde du formulaire conserve ce réglage.'],
  [/devise/i, 'Choisissez la devise utilisée par défaut pour votre activité, par exemple EUR pour l’euro.'],
  [/profession/i, 'Choisissez la profession du praticien pour identifier son activité au cabinet.'],
  [/nom du lieu/i, 'Donnez un nom reconnaissable au lieu, par exemple Cabinet principal. Ajoutez ensuite son adresse.'],
  [/nom de la séance/i, 'Nommez le motif de rendez-vous, par exemple Bilan initial. Il apparaîtra dans la liste lors de la planification.'],
  [/durée.*minute/i, 'Indiquez la durée du rendez-vous, par exemple 45 pour un bilan ou 30 pour un suivi.'],
  [/intervalle entre les départs/i, 'Indiquez l’espacement des débuts proposés : 15 minutes donne, par exemple, 9 h, 9 h 15, 9 h 30. Ce n’est pas la durée de la séance.'],
  [/préparation avant/i, 'Réservez un temps avant le rendez-vous, par exemple 5 minutes pour préparer la salle. Mettez 0 si vous n’en avez pas besoin.'],
  [/pause après/i, 'Réservez un temps après le rendez-vous, par exemple 5 minutes entre deux patients.'],
  [/jour de la semaine/i, 'Choisissez le jour auquel ces horaires se répéteront, par exemple lundi. Une autre plage peut être créée pour l’après-midi.'],
  [/valide à partir/i, 'Choisissez la première date d’application de ces horaires hebdomadaires.'],
  [/valide jusqu/i, 'Facultatif : fixez la dernière date d’application des horaires. Laissez vide pour les conserver sans date de fin.'],
  [/date concernée/i, 'Choisissez la date de l’absence ou de l’ouverture exceptionnelle. Elle ne modifie pas tous les jours de la semaine.'],
  [/journée entière/i, 'Cochez pour bloquer ou ouvrir toute la journée ; décochez pour préciser une plage horaire.'],
  [/fermeture|absence/i, 'Cette option bloque des rendez-vous pendant la période choisie, même si des horaires habituels existent.'],
  [/ouverture/i, 'Cette option ajoute une disponibilité pour cette date, en dehors des horaires habituels.'],
  [/disponible à partir/i, 'Indiquez la première date à laquelle le patient accepte un rendez-vous.'],
  [/jusqu.au/i, 'Indiquez éventuellement la dernière date souhaitée ; laissez vide si la demande n’a pas de limite.'],
  [/heure de fin|fin planifiée/i, 'Fixez la fin de la plage, après l’heure de début. Les absences et horaires doivent respecter cet ordre.'],
  [/heure de début|début planifié/i, 'Choisissez le début dans le fuseau du lieu. Vérifiez les horaires disponibles avant de confirmer.'],
  [/date locale/i, 'Choisissez la date du rendez-vous dans le fuseau du lieu de consultation.'],
  [/produit catalogue|catalogue/i, 'Choisissez une prestation du catalogue pour reprendre sa description, son prix et sa TVA. Vous pouvez ensuite adapter la ligne.'],
  [/description|désignation|prestation/i, 'Décrivez précisément ce qui est facturé ou proposé, par exemple Bilan initial. Le texte permettra au destinataire de comprendre la ligne.'],
  [/qté|quantité/i, 'Indiquez le nombre d’unités : 1 séance, 2 heures ou 12 m² selon l’unité choisie. Le total dépend de cette quantité.'],
  [/prix achat|coût/i, 'Facultatif : indiquez votre coût unitaire HT pour estimer la marge. Ce coût est distinct du prix demandé au client.'],
  [/prix|tarif/i, 'Saisissez le prix par unité hors taxes. Avec quantité 2 et prix 50 €, la ligne vaut 100 € HT avant remise et TVA.'],
  [/montant ttc/i, 'Indiquez le montant total à payer. Dans la facture rapide du dossier patient, la quantité est 1 et la TVA est actuellement de 0 %.'],
  [/tva/i, 'Indiquez le taux applicable à cette prestation : 0 signifie sans TVA. Le logiciel calcule les totaux avec le taux saisi.'],
  [/remise/i, 'Une remise de 10 réduit le prix de 10 %. Laissez 0 pour conserver le prix initial.'],
  [/unité/i, 'Choisissez l’unité du prix : unité, heure, jour, m², forfait… La quantité utilise cette même unité.'],
  [/type de document/i, 'Choisissez Facture pour demander le paiement ou Devis pour proposer un prix avant accord.'],
  [/émission/i, 'Choisissez la date portée sur le document. La numérotation sera attribuée lors de l’enregistrement.'],
  [/échéance/i, 'Choisissez la date limite de règlement de la facture, ou la date à laquelle cette tâche doit être terminée.'],
  [/validité/i, 'Choisissez jusqu’à quelle date le destinataire peut accepter ce devis.'],
  [/acompte|taux \(%\)/i, 'Choisissez aucun acompte, un pourcentage du devis ou un montant fixe. Vérifiez le récapitulatif avant d’enregistrer.'],
  [/rôle sur le chantier/i, 'Choisissez le rôle de l’intervenant : responsable, technicien, assistant ou observateur. Il indique sa mission sur cette intervention.'],
  [/site|chantier/i, 'Choisissez le site rattaché au client. S’il manque, utilisez Nouveau site pour renseigner son adresse avant de le sélectionner.'],
  [/intervenant|professionnel/i, 'Sélectionnez le professionnel autorisé à participer à cette intervention, puis choisissez son rôle avant d’enregistrer.'],
  [/travaux réalisés/i, 'Décrivez les opérations effectivement réalisées sur le terrain. Ces informations seront conservées dans le compte rendu.'],
  [/problèmes constatés/i, 'Notez les difficultés et anomalies rencontrées : accès, équipement défectueux ou travaux supplémentaires à prévoir.'],
  [/recommandations/i, 'Indiquez les suites utiles pour le client : entretien, précautions ou prochains travaux.'],
  [/motif.*annulation/i, 'Choisissez la raison de l’annulation de l’intervention, puis précisez-la si nécessaire avant de confirmer.'],
  [/opportunité|deal/i, 'Facultatif : reliez ce devis à une affaire commerciale pour suivre son avancement du premier contact à la vente.'],
  [/objet du devis|titre du projet/i, 'Donnez un titre compréhensible au devis, par exemple Entretien annuel ou Rénovation de la salle de bain.'],
  [/type d.intervention|type de travaux|type de travail/i, 'Choisissez la catégorie : intervention, chantier, installation, entretien, réparation ou diagnostic.'],
  [/priorité/i, 'Choisissez l’urgence de la tâche ou de l’intervention. Cela facilite le tri ; ce réglage ne crée pas de rendez-vous.'],
  [/statut/i, 'Choisissez l’état à afficher ou à enregistrer : à faire, en cours, terminé… Un filtre ne modifie pas les dossiers.'],
  [/lier à|entité liée/i, 'Facultatif : reliez la tâche à un client ou une affaire. Il faut le type et l’identifiant du dossier correspondant.'],
  [/assigné|responsable/i, 'Choisissez la personne chargée de suivre cette tâche ou intervention.'],
  [/titre|intitulé/i, 'Résumez l’action concrète, par exemple Rappeler le client ou Vérifier le dossier. Ajoutez les détails dans Description.'],
  [/nom.*prestation|nom.*produit|nom.*service/i, 'Donnez un nom au tarif réutilisable, par exemple Bilan initial, Heure de conseil ou Déplacement.'],
  [/e.?mail|courriel/i, 'Renseignez l’adresse de contact correcte. Pour un exemple fictif, laissez vide si le champ est facultatif ; aucun e-mail n’est envoyé par le guide.'],
  [/téléphone/i, 'Renseignez un numéro permettant de joindre ce contact. Vous pouvez laisser vide pour un exemple fictif.'],
  [/adresse/i, 'Renseignez la rue et le numéro. Complétez séparément le code postal, la ville et le pays.'],
  [/code postal/i, 'Saisissez le code postal de l’adresse, par exemple 75001 pour Paris.'],
  [/ville/i, 'Saisissez la commune de l’adresse, par exemple Paris.'],
  [/pays/i, 'Choisissez le pays de l’adresse de contact.'],
  [/secteur/i, 'Choisissez le secteur d’activité du client ; Autre permet de le préciser.'],
  [/site web/i, 'Facultatif : indiquez le site du client pour retrouver ses informations publiques.'],
  [/poste|fonction/i, 'Indiquez le rôle de votre interlocuteur, par exemple Responsable administratif.'],
  [/nom|prénom/i, 'Renseignez le nom affiché pour identifier cette personne ou cette activité.'],
  [/recherch|filtr/i, 'Renseignez votre recherche pour retrouver les dossiers correspondants, puis utilisez Rechercher si ce bouton est proposé.'],
];

const actions: [RegExp, string][] = [
  [/coordonnées|organisation/i, 'Ouvrez les coordonnées de votre activité. Renseignez le nom, l’adresse et les moyens de contact, puis enregistrez.'],
  [/ajouter un patient|nouveau patient/i, 'Cliquez pour ouvrir la fiche administrative. Le guide suivra le nom, le prénom, la date de naissance et les coordonnées jusqu’à Créer le patient.'],
  [/nouveau client|ajouter un client/i, 'Cliquez pour créer le destinataire de vos devis et factures. Le guide suivra ses coordonnées et celles de votre interlocuteur.'],
  [/factures.*règlements/i, 'Ouvrez la facturation de ce patient. Le formulaire permet d’émettre sa facture de soins et l’historique affiche les documents enregistrés.'],
  [/nouvelle séance|rendez-vous|planifier/i, 'Cliquez pour réserver un rendez-vous. Il vous faudra un patient, un lieu, un praticien associé et un type de séance ; configurez-les d’abord si le bouton est indisponible.'],
  [/ajouter un lieu/i, 'Cliquez, puis donnez un nom au lieu et renseignez son fuseau horaire et ses coordonnées. Enregistrez avant de créer le praticien.'],
  [/ajouter un praticien/i, 'Cliquez pour créer la fiche du professionnel. Après l’enregistrement, utilisez Affecter lieux pour lui associer son cabinet.'],
  [/affecter lieux/i, 'Cliquez, cochez les lieux où exerce ce praticien, puis enregistrez les affectations. Cette étape rend le praticien disponible dans le planning du lieu.'],
  [/praticiens/i, 'Ouvrez l’onglet de l’équipe. Ajoutez votre fiche, même si vous exercez seul, puis associez vos lieux.'],
  [/salles/i, 'Ouvrez les salles, ajoutez un nom et choisissez le lieu auquel chaque salle appartient. Leur utilisation dans les rendez-vous est facultative.'],
  [/ressources|équipements/i, 'Ouvrez les équipements du lieu. Ajoutez les ressources que vous souhaitez identifier dans la structure de votre cabinet.'],
  [/ajouter des horaires/i, 'Cliquez pour définir une plage qui se répète chaque semaine, par exemple lundi de 9 h à 12 h.'],
  [/absence|ouverture exceptionnelle/i, 'Cliquez pour bloquer des congés ou ouvrir un créneau exceptionnel à une date précise.'],
  [/nouveau type de séance/i, 'Cliquez pour donner un nom et une durée à un motif de rendez-vous, puis régler les temps de préparation et de pause.'],
  [/nouveau devis|créer un devis/i, 'Cliquez pour choisir le destinataire, décrire les prestations, saisir les quantités et les prix puis vérifier le total avant d’enregistrer.'],
  [/nouveau document|nouvelle facture|créer une facture/i, 'Cliquez pour ouvrir le document. Choisissez son destinataire, ses dates et ses lignes de prestation avant d’enregistrer.'],
  [/nouvelle prestation|nouveau produit|ajouter.*prestation/i, 'Cliquez pour mémoriser un nom, une description, un prix unitaire HT et un taux de TVA dans le catalogue.'],
  [/ajouter une ligne/i, 'Cliquez pour ajouter une prestation distincte. Le guide intégrera ses nouveaux champs : description, quantité, prix, TVA et remise.'],
  [/lot|tranche|section|option|variante/i, 'Organisez les lignes du devis en groupes. Les options et variantes permettent de distinguer des propositions facultatives ; vérifiez celles incluses dans le total.'],
  [/mode avancé/i, 'Activez pour afficher les unités, catégories de lignes, coûts et sections du devis. Le guide expliquera aussi ces nouveaux champs.'],
  [/voir.*tâches/i, 'Ouvrez les rappels administratifs. Une tâche sert à suivre une action et une échéance ; elle ne réserve pas de créneau patient.'],
  [/nouvelle tâche|créer.*tâche/i, 'Cliquez pour définir le rappel, sa priorité, son responsable et son échéance.'],
  [/supprimer|archiver|désactiver/i, 'Cette action modifie ou retire un dossier. Pour découvrir l’interface, vous pouvez passer cette étape sans cliquer. Vérifiez le dossier concerné avant toute confirmation.'],
  [/annuler|retour|fermer/i, 'Ce bouton ferme le formulaire ou revient à l’écran précédent. Les modifications non enregistrées ne seront pas conservées.'],
  [/modifier|éditer/i, 'Ouvrez le formulaire de ce dossier. Le guide suivra les champs modifiables puis le bouton d’enregistrement.'],
  [/ajouter.*intervenant|affecter.*intervenant/i, 'Cliquez pour choisir le professionnel qui participe à l’intervention et son rôle, puis enregistrez cette affectation.'],
  [/compte rendu|rapport/i, 'Ouvrez le compte rendu de l’intervention. Renseignez le résumé, les travaux, les problèmes et vos recommandations. Relisez-le avant de le finaliser.'],
  [/envoyer|inviter/i, 'Cette action peut transmettre un document ou une invitation au destinataire indiqué. Vérifiez ce destinataire et le contenu avant de confirmer.'],
  [/convertir/i, 'Ce bouton transforme le devis selon les actions proposées sur ce document. Vérifiez les lignes et montants du document résultant.'],
  [/recevoir.*lien/i, 'Demandez le lien sécurisé, ouvrez l’e-mail reçu puis saisissez et confirmez le nouveau mot de passe sur la page dédiée.'],
  [/abonnement|forfait/i, 'Consultez votre forfait MonService. Il concerne l’utilisation du logiciel ; vos patients ou clients vous règlent directement.'],
  [/semaine|mois|jour|aujourd.hui|suivant|précédent/i, 'Utilisez ce contrôle pour changer la période du calendrier sans modifier les rendez-vous.'],
  [/voir|ouvrir|consulter/i, 'Cliquez pour consulter le dossier ou la liste correspondante. Les champs et actions de l’écran suivant auront aussi leur guide.'],
];

export function describeControl(element: HTMLElement, path: string, type: WorkspaceType): ControlHelp {
  const title = controlLabel(element);
  const explicit = element.getAttribute('data-guide-text');
  const field = element.matches('input, select, textarea, [contenteditable="true"]');
  const save = (element instanceof HTMLButtonElement && element.type === 'submit' && !!element.form) || element.matches('input[type="submit"]') || /^(enregistrer|créer le patient|émettre la facture|confirmer le rendez-vous|sauvegarder)/i.test(title);
  let text = explicit || (field ? fields : actions).find(([match]) => match.test(title))?.[1];
  if (save) text = 'Vérifiez les champs et le récapitulatif, puis cliquez ici pour enregistrer. Le guide attend la confirmation du logiciel. Si une erreur apparaît, corrigez-la et réessayez ; un clic seul ne confirme pas la création.';
  if (field && /nom de l.entreprise/i.test(title)) text = 'Indiquez le nom du client ou de son entreprise, par exemple CLIENT TEST pour un exercice fictif.';
  if (field && path === '/parametres/organisation' && /nom/i.test(title)) text = type === 'paramedical' ? 'Indiquez le nom de votre cabinet. Il identifie votre activité, distincte de votre nom de compte personnel.' : 'Indiquez le nom de votre activité ou de votre entreprise.';
  if (field && /nom.*prestation|nom.*produit|nom.*service/i.test(title)) text = 'Nommez le tarif réutilisable : Bilan initial, Heure de conseil ou Déplacement. Ce nom sera proposé dans votre catalogue.';
  if (field && /connexion/i.test(title)) text = 'Cette adresse identifie votre compte de connexion. Elle est affichée en lecture seule et reçoit les messages de sécurité.';
  if (field && element instanceof HTMLSelectElement && /^patient/i.test(title)) text = 'Choisissez le patient actif concerné par le document. La sauvegarde reprend son destinataire administratif ou son représentant de facturation, sans copier les informations cliniques. S’il manque, créez d’abord sa fiche dans Patients.';
  if (field && path.startsWith('/operations/') && /titre/i.test(title)) text = 'Nommez le travail à réaliser, par exemple Réparation de la chaudière. Ce titre identifie l’intervention dans la liste et le planning.';
  if (!field && /^\/operations\/[^/]+$/.test(path) && !element.closest('form')) {
    const transitions: Record<string, string> = {
      'Démarrer': 'Passez l’intervention en cours lorsque le travail commence. L’historique conserve ce changement de statut.',
      'Mettre en pause': 'Suspendez le travail en cours. Vous pourrez utiliser Reprendre lorsque l’intervention peut continuer.',
      'Reprendre': 'Remettez l’intervention en cours après une pause, pour poursuivre le suivi du travail.',
      'Terminer': 'Marquez l’intervention terminée lorsque les travaux sont achevés. Vérifiez auparavant les comptes rendus et les actions restantes.',
      'Annuler': 'Ce bouton ouvre la confirmation d’annulation de l’intervention. Choisissez le motif et vérifiez le dossier avant de confirmer ; il ne ferme pas simplement un formulaire.',
    };
    text = transitions[title] || text;
  }
  if (field && element.matches('input[type="checkbox"]') && element.closest('[data-guide-form="structure"]')) text = 'Cochez ce lieu pour y affecter le praticien. Vous pouvez choisir plusieurs lieux, puis enregistrer les affectations.';
  if (field && element.matches('input[type="radio"]') && element.closest('[data-guide-form="structure"]')) text = 'Choisissez le lieu principal parmi les lieux affectés à ce praticien, puis enregistrez.';
  if (!text) text = field ? `Renseignez « ${title} » pour ce dossier. Les champs marqués * sont obligatoires ; les autres peuvent rester vides. Vous pourrez vérifier les valeurs avant l’enregistrement.` : `Utilisez « ${title} » pour ouvrir cette rubrique ou appliquer l’action indiquée. Le guide suivra les contrôles qui apparaissent. Vous pouvez aussi passer à l’élément suivant sans cliquer.`;
  if (element.matches(':disabled, [aria-disabled="true"]')) text += ' Ce contrôle est indisponible pour le moment. Complétez les prérequis ou la sélection indiqués sur la page ; vous pouvez poursuivre la découverte sans l’activer.';
  if (field && element.matches('[readonly]')) text += ' Ce champ est en lecture seule.';
  return { title, text, action: field ? 'fill' : save ? 'save' : element.matches('button, a, [role="button"], [role="tab"]') ? 'click' : 'read' };
}
