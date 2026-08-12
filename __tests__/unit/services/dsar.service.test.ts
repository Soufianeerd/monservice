import { vi, describe, it, expect, beforeEach } from 'vitest';
vi.mock('server-only', () => ({}));
import { DSARService } from '@/lib/services/dsar.service';
import { db } from '@/lib/db/server';

vi.mock('@/lib/db/server', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ id: 'test-id' }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  }
}));

describe('DSARService', () => {
  let dsarService: DSARService;

  beforeEach(() => {
    dsarService = new DSARService();
    vi.clearAllMocks();
  });

  it('should create a DSAR request with a 30-day deadline', async () => {
    const request = await dsarService.createRequest('user1', 'org1', 'access', 'Want my data');
    
    expect(db.insert).toHaveBeenCalled();
    expect(request.status).toBe('RECEIVED');
    
    // Deadline should be roughly 30 days from now
    const now = new Date().getTime();
    const deadline = request.deadline.getTime();
    const diffDays = Math.round((deadline - now) / (1000 * 60 * 60 * 24));
    
    expect(diffDays).toBe(30);
  });

  it('should process a DSAR request', async () => {
    await dsarService.processRequest('req1', 'Here is your data', 'COMPLETED', 'admin1');
    expect(db.update).toHaveBeenCalled();
    expect((db as any).set).toHaveBeenCalledWith(expect.objectContaining({
      status: 'COMPLETED',
      response: 'Here is your data',
      processedBy: 'admin1',
    }));
  });
});
