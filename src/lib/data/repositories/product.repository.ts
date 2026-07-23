import { BaseRepository } from './base.repository';
import { Product } from '../interfaces';
import { productsFixture } from '../fixtures';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super(productsFixture);
  }

  async findByOrganization(organizationId: string): Promise<Product[]> {
    await this.simulateLatency();
    return this.items.filter((i) => i.organizationId === organizationId);
  }
}

export const productRepository = new ProductRepository();
