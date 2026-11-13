// @vitest-environment node
import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({rows:vi.fn()}));
vi.mock('react',()=>({cache:(fn:unknown)=>fn}));
vi.mock('@/lib/db/server',()=>({db:{select:()=>({from:()=>({where:mocks.rows})})}}));
import { getSessionContext,requireSession } from '@/lib/auth/session';
describe('Account lifecycle is enforced for a still-valid provider identity',()=>{
 it('allows an active stored profile',async()=>{mocks.rows.mockResolvedValue([{id:'subject',email:'subject@example.test',profileType:'client',organizationId:'org',accountClosedAt:null}]);expect((await getSessionContext())?.userId).toBe('subject');});
 it('denies a closed profile even while the provider returns a user',async()=>{mocks.rows.mockResolvedValue([{profileType:'professional',organizationId:'org',accountClosedAt:new Date()}]);expect(await getSessionContext()).toBeNull();await expect(requireSession()).rejects.toMatchObject({statusCode:401});});
});
