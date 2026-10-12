import type { WorkspaceType } from '@/lib/workspaces/types';

export interface HelpStep { title: string; text: string; target: string }
export interface PageHelp { title: string; text: string; steps: HelpStep[] }

const overview = 'main h1, main h2';
const help: Record<string, PageHelp> = {
  '/dashboard': { title: 'Votre journée au cabinet', text: 'Retrouvez vos tâches et commencez une action : ajouter un patient, planifier un rendez-vous ou créer une facture.', steps: [
    { title: 'Les tâches à traiter', text: 'Ce cadre affiche le nombre de tâches ouvertes, les prochaines échéances et leur priorité. « Voir les tâches » permet de créer et suivre vos rappels administratifs.', target: '[data-guide="dashboard-tasks"]' },
    { title: 'Les coordonnées de votre cabinet', text: 'Ce bouton ouvre le nom et les coordonnées de votre activité. Le guide vous accompagnera jusqu’au bouton d’enregistrement.', target: 'main a[href="/parametres/organisation"]' },
    { title: 'Ajouter un patient', text: 'Cliquez ici pour créer sa fiche administrative. Le guide pourra vous accompagner champ par champ.', target: 'main a[href="/patients/new"]' },
    { title: 'Planifier un rendez-vous', text: 'Cliquez ici pour ouvrir le calendrier, puis Nouvelle séance. Configurez d’abord le lieu, le praticien, ses horaires et le type de séance.', target: 'main a[href="/agenda/calendrier"]' },
    { title: 'Créer une facture patient', text: 'Cliquez pour choisir le patient, sélectionner les prestations et vérifier les quantités, les prix et la TVA avant d’enregistrer.', target: '[data-guide="dashboard-patient-invoice"]' },
    { title: 'Configurer les lieux et l’équipe', text: 'Créez votre lieu, ajoutez votre fiche de praticien puis utilisez Affecter lieux. Le guide propose un parcours pour chacune de ces étapes.', target: 'main a[href="/parametres/cabinet"]' },
  ] },
  '/patients': { title: 'Retrouver vos patients', text: 'Chaque fiche rassemble les informations du patient. Les dossiers archivés restent consultables avec le filtre de statut.', steps: [
    { title: 'Ajouter un patient', text: 'Créez sa fiche administrative avant de planifier ses rendez-vous.', target: '[data-tour="new-patient"]' },
    { title: 'Chercher un dossier', text: 'Renseignez le nom, le prénom ou la date de naissance, puis cliquez sur Rechercher. Le statut s’applique dès sa sélection.', target: '[data-tour="patient-filters"]' },
  ] },
  '/agenda/calendrier': { title: 'Les rendez-vous de vos patients', text: 'Consultez votre planning par jour, semaine ou mois. Un rendez-vous associe un patient, un praticien, un lieu et un type de séance.', steps: [
    { title: 'Votre planning', text: 'Les filtres permettent de choisir le lieu et le praticien affichés. Les heures utilisent le fuseau du lieu de consultation.', target: '[data-tour="calendar-controls"]' },
    { title: 'Planifier une séance', text: 'Choisissez le patient et un créneau disponible. Les horaires, absences et durées de séance déterminent les créneaux proposés.', target: '[data-tour="new-appointment"]' },
  ] },
  '/agenda/disponibilites': { title: 'Quand pouvez-vous recevoir des patients ?', text: 'Les horaires habituels se répètent chaque semaine. Une absence bloque une date ; une ouverture exceptionnelle ajoute une disponibilité ponctuelle.', steps: [
    { title: 'Préparer les disponibilités', text: 'Un lieu et un praticien sont nécessaires. S’ils manquent, le lien de configuration vous guide vers « Lieux et équipe ». Sinon, sélectionnez-les ici.', target: '[data-tour="availability-controls"], [data-tour="availability-setup"]' },
    { title: 'Horaires et absences', text: 'Exemple : lundi 9 h–12 h chaque semaine, puis une absence le lundi de vos congés. Une fermeture prend priorité sur les horaires habituels.', target: '[data-tour="availability-controls"], [data-tour="availability-setup"]' },
  ] },
  '/agenda/types-seances': { title: 'Les motifs de rendez-vous', text: 'Définissez par exemple un bilan initial de 45 minutes et un suivi de 30 minutes. Ce réglage sert au planning ; les prestations et tarifs servent aux factures.', steps: [
    { title: 'Durée et temps de préparation', text: 'La durée correspond au rendez-vous. Le temps avant ou après réserve une pause. L’intervalle détermine les heures de départ proposées.', target: overview },
    { title: 'Vos modèles de séance', text: 'Vous pouvez adapter les modèles proposés à votre pratique, puis les sélectionner lors de la prise de rendez-vous.', target: 'main button' },
  ] },
  '/agenda/liste-attente': { title: 'Proposer un créneau qui se libère', text: 'Inscrivez les patients qui attendent un rendez-vous, avec leurs préférences. Retrouvez les demandes lorsqu’un créneau devient disponible.', steps: [{ title: 'Les demandes en attente', text: 'Filtrez par lieu, praticien et type de séance pour retrouver les demandes adaptées à votre planning.', target: overview }] },
  '/agenda/taches': { title: 'Vos rappels de travail', text: 'Ajoutez des tâches administratives, une échéance et une priorité pour organiser votre journée.', steps: [{ title: 'Tâches du cabinet', text: 'Une tâche sert de rappel ; elle ne réserve pas de créneau dans le calendrier des patients.', target: overview }] },
  '/parametres/profil': { title: 'Votre compte personnel', text: 'Modifiez votre nom et sécurisez votre accès. Les coordonnées du cabinet et l’abonnement MonService sont dans des rubriques séparées.', steps: [
    { title: 'Vos informations personnelles', text: 'Le nom est modifiable. L’adresse e-mail de connexion identifie votre compte et reçoit les messages de sécurité.', target: '[data-tour="profile-form"]' },
    { title: 'Changer le mot de passe', text: 'Demandez un lien sécurisé, ouvrez-le dans votre boîte e-mail, puis choisissez et confirmez votre nouveau mot de passe. Rien ne change avant la validation.', target: '[data-tour="password-security"]' },
  ] },
  '/parametres/organisation': { title: 'Les coordonnées du cabinet', text: 'Il s’agit des coordonnées de votre activité professionnelle, distinctes de votre compte personnel et des lieux de consultation.', steps: [{ title: 'Identifier votre activité', text: 'Renseignez le nom du cabinet et ses coordonnées de contact. Aucun compte Stripe professionnel n’est nécessaire.', target: '[data-tour="company-form"]' }] },
  '/parametres/cabinet': { title: 'Les lieux et l’équipe', text: 'Ajoutez votre lieu de consultation, puis votre fiche de praticien et associez-la à ce lieu. Les salles et équipements sont facultatifs.', steps: [
    { title: 'Vos lieux de consultation', text: 'Un lieu peut être un cabinet ou un autre site où vous recevez vos patients. Son fuseau horaire sert au planning.', target: '[data-tour="practice-structure"]' },
    { title: 'Vos praticiens', text: 'Même si vous exercez seul, créez votre fiche de praticien et associez-la à votre lieu. Vous pourrez ensuite régler vos horaires.', target: '[data-tour="practice-structure"]' },
  ] },
  '/parametres/facturation': { title: 'Votre abonnement MonService', text: 'Ces forfaits concernent l’utilisation de MonService. Ils ne concernent pas les honoraires ni les factures de vos patients.', steps: [{ title: 'L’abonnement à votre logiciel', text: 'Le règlement de votre abonnement est sécurisé par Stripe pour le compte de MonService. Vous n’avez pas à créer ou connecter un compte Stripe.', target: '[data-tour="subscription-plans"]' }] },
  '/parametres/notifications': { title: 'Les notifications du cabinet', text: 'Retrouvez les alertes de votre activité. Les rappels envoyés aux patients se configurent séparément dans les réglages prévus à cet effet.', steps: [{ title: 'Vos alertes', text: 'Les notifications vous informent d’une action à suivre dans votre activité.', target: overview }] },
  '/facturation/factures': { title: 'Vos factures patients', text: 'Préparez les documents de vos prestations et suivez leur règlement. Vous encaissez vos patients avec vos moyens habituels, sans connecter un compte Stripe.', steps: [{ title: 'Facturer vos prestations', text: 'Une facture concerne les honoraires de votre activité. L’abonnement MonService est géré séparément dans les paramètres.', target: overview }] },
  '/facturation/devis': { title: 'Estimer une prestation', text: 'Un devis propose un prix à votre patient avant la prestation. Utilisez-le lorsque votre activité en a besoin ; il n’est pas nécessaire pour chaque séance.', steps: [{ title: 'Vos devis', text: 'Le devis décrit les prestations proposées et leur montant avant acceptation.', target: overview }] },
  '/facturation/produits': { title: 'Vos prestations et tarifs', text: 'Ce catalogue mémorise vos prestations et leurs prix pour remplir vos devis et factures. Il ne remplace pas les types de séances de l’agenda.', steps: [{ title: 'Réutiliser un tarif', text: 'Ajoutez par exemple une prestation de bilan ou de suivi, puis sélectionnez-la lors de la création d’un document.', target: '[data-tour="service-catalog"]' }] },
};

const commonPages: Record<string, [string, string]> = {
  '/clients': ['Vos clients', 'Créez un client avant un devis, une facture ou une intervention. Ses coordonnées et celles de votre interlocuteur se conservent dans sa fiche.'],
  '/deals': ['Vos opportunités commerciales', 'Une opportunité suit une vente potentielle : client, montant estimé et étape du pipeline. Un devis chiffre la proposition ; une facture demande son règlement.'],
  '/operations': ['Vos interventions et chantiers', 'Une intervention associe un client, son site et les travaux à réaliser. Planifiez les dates, attribuez les intervenants puis suivez l’avancement et les comptes rendus.'],
  '/messages': ['Votre messagerie', 'Choisissez une conversation, lisez les échanges puis composez votre message. Vérifiez le destinataire avant l’envoi.'],
  '/marketplace': ['Les demandes de services', 'Consultez les demandes disponibles et ouvrez une demande pour examiner les besoins avant de proposer une réponse.'],
  '/parametres/privacy': ['Les outils de confidentialité', 'Ces rubriques regroupent les consentements, demandes d’accès, registre et incidents. Le guide montre les contrôles disponibles et les informations à renseigner.'],
  '/parametres/notifications': ['Vos notifications', 'Consultez les alertes de votre activité et les préférences proposées sur cet écran.'],
};

export function getPageHelp(path: string, type: WorkspaceType = 'paramedical'): PageHelp {
  const isForm = /\/(new|nouveau|edit)$/.test(path);
  if (isForm && !path.startsWith('/patients/')) {
    const subject = path.startsWith('/facturation/devis') ? 'devis' : path.startsWith('/facturation/factures') ? 'facture' : path.startsWith('/facturation/produits') ? 'prestation et son tarif' : path.startsWith('/operations') ? 'intervention' : path.startsWith('/clients') ? 'client' : path.startsWith('/deals') ? 'opportunité commerciale' : 'tâche';
    return { title: `Renseigner votre ${subject}`, text: 'Le tutoriel suit chaque champ, les options qui apparaissent et le bouton d’enregistrement. Les exemples restent des suggestions : vous gardez la main sur la saisie et la sauvegarde.', steps: [] };
  }
  if (type !== 'paramedical' && path === '/dashboard') return { title: type === 'field_service' ? 'Votre activité sur le terrain' : 'Votre activité professionnelle', text: 'Chaque indicateur et cadre présente une partie de votre activité. Découvrez-les, puis choisissez un parcours pour créer un client, une prestation, un devis ou une facture.', steps: [] };
  if (type !== 'paramedical' && path === '/agenda/calendrier') return { title: 'Votre calendrier de travail', text: 'Changez la période et consultez les événements affichés. Les tâches suivent les rappels administratifs ; les interventions se créent dans leur rubrique dédiée.', steps: [] };
  if (type !== 'paramedical' && path === '/parametres/organisation') return { title: 'Les coordonnées de votre activité', text: 'Renseignez les coordonnées professionnelles distinctes de votre compte personnel. Aucun compte Stripe professionnel n’est nécessaire.', steps: [] };
  const common = Object.keys(commonPages).find(key => path === key || path.startsWith(`${key}/`));
  if (common) return { title: commonPages[common][0], text: commonPages[common][1], steps: [] };
  if (type !== 'paramedical' && path.startsWith('/facturation/')) return { title: path.includes('/devis') ? 'Vos devis' : path.includes('/produits') ? 'Vos prestations et tarifs' : 'Vos factures clients', text: 'Choisissez un parcours pour préparer votre document ou votre tarif. Les quantités, prix, remises et TVA déterminent le total ; l’encaissement du client reste géré par vous.', steps: [] };
  if (help[path]) return help[path];
  if (path === '/patients/new') return { title: 'Ajouter un patient', text: 'Le guide suit chaque champ jusqu’à Créer le patient. Pour vous entraîner, un exemple fictif est proposé dans l’aide ; vous pouvez quitter avant d’enregistrer.', steps: [] };
  if (path.startsWith('/patients/')) return { title: 'Le dossier de votre patient', text: 'Retrouvez les informations et les rendez-vous de ce patient dans les rubriques de son dossier.', steps: [{ title: 'Parcourir le dossier', text: 'Les onglets regroupent les informations du patient. Vérifiez le dossier ouvert avant de modifier une information.', target: overview }] };
  const parent = Object.keys(help).filter(key => path.startsWith(`${key}/`)).sort((a, b) => b.length - a.length)[0];
  return parent ? help[parent] : { title: 'Comprendre cette page', text: 'Découvrez les contrôles de cette page ou choisissez un parcours complet pour prendre en main votre activité.', steps: [] };
}
