import { BaseRepository } from './base.repository';
import { Organization } from '../interfaces';
import { organizationsFixture } from '../fixtures';

export class OrganizationRepository extends BaseRepository<Organization> {
  constructor() {
    super(organizationsFixture);
  }
}

export const organizationRepository = new OrganizationRepository();
