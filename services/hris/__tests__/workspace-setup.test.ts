import {setupGrantSchema, setupUnitSchema} from '../workspace-setup.service'
import {assertSetupPilot, assertSetupReviewInTx} from '../setup-reviewer.service'
const base={reviewerUserId:'checker',employeeId:'employee',domain:'TIME_REQUEST',authority:'PEOPLE_READ',effectiveFrom:'2026-01-01',effectiveTo:'2027-01-01',reason:'Reviewed role'}
afterEach(()=>delete process.env.HRIS_SETUP_PILOT_ORGANIZATIONS)
test.each([{domain:'TIME_POLICY'}, {employeeId:null}, {effectiveTo:'2025-01-01'}, {authority:'ADMIN'}, {organizationId:'forged'}])('reject invalid bounded grant %j', patch=>expect(setupGrantSchema.safeParse({...base,...patch}).success).toBe(false))
test('policy authority must be explicit organization scope',()=>expect(setupGrantSchema.parse({...base,domain:'TIME_POLICY',employeeId:null}).employeeId).toBeNull())
test('pilot uses exact tenant identities and fails closed',()=>{expect(()=>assertSetupPilot('a')).toThrow();process.env.HRIS_SETUP_PILOT_ORGANIZATIONS=' a,b ';expect(()=>assertSetupPilot('a')).not.toThrow();expect(()=>assertSetupPilot('ab')).toThrow()})
test('unit types are bounded',()=>expect(setupUnitSchema.safeParse({code:'x',name:'x',type:'ADMIN',effectiveFrom:'2026-01-01',effectiveTo:'2027-01-01'}).success).toBe(false))
test('missing review grant denies at source',async()=>{process.env.HRIS_SETUP_PILOT_ORGANIZATIONS='a';const tx={$queryRaw:jest.fn().mockResolvedValueOnce([{id:'checker'}]).mockResolvedValueOnce([{permissions:['hris.people.read']}]).mockResolvedValueOnce([{id:'employee'}]).mockResolvedValueOnce([])};await expect(assertSetupReviewInTx(tx as never,{organizationId:'a',actorId:'checker',actorPermissions:['hris.people.read']},'TIME_REQUEST','employee')).rejects.toThrow('REVIEW_SCOPE_REQUIRED')})
