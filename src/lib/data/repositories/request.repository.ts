import { Request } from '../interfaces';
import { requestsFixture } from '../fixtures';

class RequestRepository {
  private requests: Request[] = [...requestsFixture];

  async findAll(): Promise<Request[]> {
    return [...this.requests];
  }

  async findById(id: string): Promise<Request | undefined> {
    return this.requests.find(r => r.id === id);
  }

  async findByClient(clientId: string): Promise<Request[]> {
    return this.requests.filter(r => r.clientId === clientId);
  }

  async findByOrganization(orgId: string): Promise<Request[]> {
    return this.requests.filter(r => r.organizationId === orgId);
  }

  async findPublic(organizationId: string, filters?: { category?: string; location?: string; minBudget?: number; maxBudget?: number }): Promise<Request[]> {
    let results = this.requests.filter(r => r.status === 'published' && r.isPublic !== false);
    
    if (filters) {
      if (filters.category) {
        results = results.filter(r => r.category === filters.category);
      }
      if (filters.location) {
        results = results.filter(r => r.location.toLowerCase().includes(filters.location!.toLowerCase()));
      }
      if (filters.minBudget !== undefined) {
        results = results.filter(r => r.budget !== undefined && r.budget >= filters.minBudget!);
      }
      if (filters.maxBudget !== undefined) {
        results = results.filter(r => r.budget !== undefined && r.budget <= filters.maxBudget!);
      }
    }
    
    return results;
  }

  async create(request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>): Promise<Request> {
    const newRequest: Request = {
      ...request,
      id: `req-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.requests.push(newRequest);
    return newRequest;
  }

  async update(id: string, updates: Partial<Omit<Request, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Request | undefined> {
    const index = this.requests.findIndex(r => r.id === id);
    if (index === -1) return undefined;

    this.requests[index] = {
      ...this.requests[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.requests[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.requests.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.requests.splice(index, 1);
    return true;
  }
}

export const requestRepository = new RequestRepository();
