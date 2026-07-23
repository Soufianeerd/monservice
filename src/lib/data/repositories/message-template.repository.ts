import { BaseRepository } from './base.repository';
import { MessageTemplate } from '../interfaces';
import { messageTemplatesFixture } from '../fixtures';

export class MessageTemplateRepository extends BaseRepository<MessageTemplate> {
  constructor() {
    super(messageTemplatesFixture);
  }

  async findByOrganization(organizationId: string): Promise<MessageTemplate[]> {
    await this.simulateLatency();
    return this.items.filter(item => item.organizationId === organizationId);
  }
}

export const messageTemplateRepository = new MessageTemplateRepository();
