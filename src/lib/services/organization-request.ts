import 'server-only';
import { cache } from 'react';
import { organizationService } from './organization.service';

/**
 * Lecture de l'organisation mémorisée le temps d'une requête : le layout et la page
 * qui la demandent tous les deux ne déclenchent qu'une lecture en base.
 * Réservé aux composants serveur (pages et layouts), pas aux actions qui écrivent.
 */
export const getOrganizationForRequest = cache((organizationId: string) => organizationService.getById(organizationId));
