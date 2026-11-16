import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clinicalStorageService } from '@/lib/services/clinical-storage.service';
const mocks = vi.hoisted(() => ({ actor: vi.fn(), rows: vi.fn(), put: vi.fn(), presign: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ requireProfessional: mocks.actor, requireSession: mocks.actor }));
vi.mock('@/lib/db/server', () => ({ db: { select: () => ({ from: () => ({ where: () => ({ then: (resolve: (value: unknown) => unknown) => mocks.rows().then(resolve), limit: () => mocks.rows() }) }) }) } }));
vi.mock('@/lib/storage/neon-object-store', () => ({ objectStore: { put: mocks.put, presign: mocks.presign, removeOrphan: mocks.remove } }));
const path = 'org/practitioner/patient/document/test.pdf';
beforeEach(() => { vi.resetAllMocks(); mocks.actor.mockResolvedValue({ userId: 'actor', organizationId: 'org' }); });
describe('Clinical storage authorization and compensation', () => {
  it('denies foreign tenant paths before object transport', async () => {
    await expect(clinicalStorageService.uploadFile('foreign/p/p/d/test.pdf', Buffer.from('x'), 'application/pdf')).rejects.toThrow();
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it('requires a linked active practitioner and patient', async () => {
    mocks.rows.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'patient' }]);
    await expect(clinicalStorageService.uploadFile(path, Buffer.from('x'), 'application/pdf')).rejects.toThrow();
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it('does not remove a committed document during compensation', async () => {
    mocks.rows.mockResolvedValue([{ id: 'authorized' }]);
    await expect(clinicalStorageService.removeFileAfterFailedMetadataWrite(path)).rejects.toThrow();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('removes only an authorized orphan after metadata failure', async () => {
    mocks.rows.mockResolvedValueOnce([{ id: 'practitioner' }]).mockResolvedValueOnce([{ id: 'patient' }]).mockResolvedValueOnce([]);
    await clinicalStorageService.removeFileAfterFailedMetadataWrite(path);
    expect(mocks.remove).toHaveBeenCalledWith('clinical-documents', path);
  });
  it('does not sign a path without RLS-visible document metadata', async () => {
    mocks.rows.mockResolvedValue([]);
    await expect(clinicalStorageService.getSignedDownloadUrl(path)).rejects.toThrow();
    expect(mocks.presign).not.toHaveBeenCalled();
  });
  it('requires a current session before signing a document', async () => {
    mocks.actor.mockRejectedValue(new Error('Session closed'));
    await expect(clinicalStorageService.getSignedDownloadUrl(path)).rejects.toThrow('Session closed');
    expect(mocks.presign).not.toHaveBeenCalled();
  });
});
