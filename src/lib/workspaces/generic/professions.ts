/**
 * Métiers de l'univers général (secteur `freelance`) : tertiaire et indépendants.
 *
 * Le métier ne change pas le cycle de travail (client → devis → facture → paiement) ;
 * il adapte le vocabulaire (« dossier » pour un juriste, « projet » pour un
 * développeur, « prestation » pour un musicien…) et le libellé de l'espace.
 */
export const GENERIC_PROFESSION_FAMILY_CODES = [
  'law_finance',
  'consulting',
  'digital_creative',
  'events_arts',
  'training',
  'personal_services',
] as const;

export type GenericProfessionFamilyCode = typeof GENERIC_PROFESSION_FAMILY_CODES[number];

export interface GenericProfessionFamily {
  code: GenericProfessionFamilyCode;
  label: string;
  /** Unité de travail suivie pour un client. */
  workSingular: string;
  workPlural: string;
}

export const GENERIC_PROFESSION_FAMILIES: Record<GenericProfessionFamilyCode, GenericProfessionFamily> = {
  law_finance: { code: 'law_finance', label: 'Droit, chiffre & patrimoine', workSingular: 'Dossier', workPlural: 'Dossiers' },
  consulting: { code: 'consulting', label: 'Conseil & gestion', workSingular: 'Mission', workPlural: 'Missions' },
  digital_creative: { code: 'digital_creative', label: 'Numérique & création', workSingular: 'Projet', workPlural: 'Projets' },
  events_arts: { code: 'events_arts', label: 'Événementiel, musique & arts', workSingular: 'Prestation', workPlural: 'Prestations' },
  training: { code: 'training', label: 'Formation & accompagnement', workSingular: 'Mission', workPlural: 'Missions' },
  personal_services: { code: 'personal_services', label: 'Services à la personne', workSingular: 'Intervention', workPlural: 'Interventions' },
};

export const GENERIC_PROFESSION_CODES = [
  // Droit, chiffre & patrimoine
  'lawyer',
  'legal_advisor',
  'notary',
  'bailiff',
  'accountant',
  'wealth_advisor',
  'insurance_broker',
  'real_estate_agent',
  // Conseil & gestion
  'business_consultant',
  'it_consultant',
  'hr_consultant',
  'virtual_assistant',
  // Numérique & création
  'web_developer',
  'graphic_designer',
  'photographer',
  'videographer',
  'community_manager',
  'copywriter',
  'translator',
  'architect_interior',
  // Événementiel, musique & arts
  'musician',
  'dj',
  'event_planner',
  'entertainer',
  'artist',
  // Formation & accompagnement
  'trainer',
  'private_tutor',
  'business_coach',
  'music_teacher',
  // Services à la personne
  'home_cleaning',
  'home_help',
  'childcare',
  'pet_care',
  'concierge',
] as const;

export type GenericProfessionCode = typeof GENERIC_PROFESSION_CODES[number];

export interface GenericProfession {
  code: GenericProfessionCode;
  label: string;
  family: GenericProfessionFamilyCode;
  description: string;
}

const p = (code: GenericProfessionCode, label: string, family: GenericProfessionFamilyCode, description: string): GenericProfession => ({ code, label, family, description });

export const GENERIC_PROFESSIONS: Record<GenericProfessionCode, GenericProfession> = {
  lawyer: p('lawyer', 'Avocat', 'law_finance', 'Dossiers clients, honoraires, conventions'),
  legal_advisor: p('legal_advisor', 'Juriste indépendant', 'law_finance', 'Conseil juridique, rédaction d’actes'),
  notary: p('notary', 'Notaire', 'law_finance', 'Suivi des dossiers et des actes'),
  bailiff: p('bailiff', 'Commissaire de justice', 'law_finance', 'Constats, significations, recouvrement'),
  accountant: p('accountant', 'Expert-comptable', 'law_finance', 'Missions comptables et fiscales'),
  wealth_advisor: p('wealth_advisor', 'Conseiller en gestion de patrimoine', 'law_finance', 'Bilans patrimoniaux, suivi clients'),
  insurance_broker: p('insurance_broker', 'Courtier', 'law_finance', 'Assurance, crédit, placements'),
  real_estate_agent: p('real_estate_agent', 'Agent ou mandataire immobilier', 'law_finance', 'Mandats, visites, honoraires'),
  business_consultant: p('business_consultant', 'Consultant', 'consulting', 'Stratégie, organisation, management'),
  it_consultant: p('it_consultant', 'Consultant informatique', 'consulting', 'Systèmes, infogérance, conseil IT'),
  hr_consultant: p('hr_consultant', 'Consultant RH / recrutement', 'consulting', 'Recrutement, paie, formation'),
  virtual_assistant: p('virtual_assistant', 'Assistant(e) indépendant(e)', 'consulting', 'Secrétariat, administratif à distance'),
  web_developer: p('web_developer', 'Développeur web', 'digital_creative', 'Sites, applications, maintenance'),
  graphic_designer: p('graphic_designer', 'Designer graphique', 'digital_creative', 'Identité visuelle, print, UI'),
  photographer: p('photographer', 'Photographe', 'digital_creative', 'Shootings, mariages, entreprises'),
  videographer: p('videographer', 'Vidéaste', 'digital_creative', 'Tournage, montage, motion'),
  community_manager: p('community_manager', 'Community manager', 'digital_creative', 'Réseaux sociaux, contenus'),
  copywriter: p('copywriter', 'Rédacteur', 'digital_creative', 'Contenus web, rédaction, SEO'),
  translator: p('translator', 'Traducteur / interprète', 'digital_creative', 'Traduction, interprétariat'),
  architect_interior: p('architect_interior', 'Architecte d’intérieur / décorateur', 'digital_creative', 'Plans, aménagement, décoration'),
  musician: p('musician', 'Musicien', 'events_arts', 'Concerts, mariages, événements'),
  dj: p('dj', 'DJ', 'events_arts', 'Soirées, mariages, entreprises'),
  event_planner: p('event_planner', 'Organisateur d’événements', 'events_arts', 'Mariages, séminaires, réceptions'),
  entertainer: p('entertainer', 'Animateur', 'events_arts', 'Animations, spectacles, enfants'),
  artist: p('artist', 'Artiste', 'events_arts', 'Œuvres, commandes, expositions'),
  trainer: p('trainer', 'Formateur', 'training', 'Sessions de formation, conventions'),
  private_tutor: p('private_tutor', 'Professeur particulier', 'training', 'Cours, soutien scolaire'),
  business_coach: p('business_coach', 'Coach professionnel', 'training', 'Accompagnement, bilans'),
  music_teacher: p('music_teacher', 'Professeur de musique', 'training', 'Cours individuels ou collectifs'),
  home_cleaning: p('home_cleaning', 'Ménage et entretien', 'personal_services', 'Ménage, repassage, entretien'),
  home_help: p('home_help', 'Aide à domicile', 'personal_services', 'Accompagnement, courses, aide'),
  childcare: p('childcare', 'Garde d’enfants', 'personal_services', 'Garde, sorties d’école'),
  pet_care: p('pet_care', 'Garde et soins d’animaux', 'personal_services', 'Pet-sitting, promenade, toilettage'),
  concierge: p('concierge', 'Conciergerie', 'personal_services', 'Gestion de locations, services'),
};

const GENERIC_PROFESSION_CODE_SET: ReadonlySet<string> = new Set(GENERIC_PROFESSION_CODES);

export function isGenericProfessionCode(value: string | null | undefined): value is GenericProfessionCode {
  return typeof value === 'string' && GENERIC_PROFESSION_CODE_SET.has(value);
}
