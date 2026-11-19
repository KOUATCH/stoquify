import {createRoot} from 'react-dom/client';
import {DailyHabitDigestDashboard} from '@/components/daily-habit/DailyHabitDigestDashboard';
import {OwnerWarRoomDashboard} from '@/components/owner-war-room/OwnerWarRoomDashboard';
import {ManagerActionCenterDashboard} from '@/components/manager-action-center/ManagerActionCenterDashboard';
import {ManagerLocationActionCenterDashboard} from '@/components/manager-action-center/ManagerLocationActionCenterDashboard';
import {daily,owner,manager,locations,proof} from '@/docs/command-center/phase-4-2026-10-24/fixtures';
const locale=location.pathname.startsWith('/fr')?'fr':'en';
const kind=location.pathname.split('/').at(-1);
// These browser controls belong to this fixture, not the application's Window contract.
const fixtureWindow=window as typeof window & {
  fixtureCommandCalls: number;
  fixtureProofCalls: number;
  fixtureRefreshMode: 'hold' | 'fail';
  fixtureProofMode: 'success' | 'pending' | 'error';
  fixtureProof: typeof proof;
  fixtureCommit: () => void;
  fixtureRevoke: () => void;
};
fixtureWindow.fixtureCommandCalls=0;fixtureWindow.fixtureProofCalls=0;fixtureWindow.fixtureRefreshMode='hold';fixtureWindow.fixtureProofMode='success';fixtureWindow.fixtureProof=proof;
type FixtureState =
  | {kind: 'daily-digest'; data: ReturnType<typeof daily>}
  | {kind: 'owner-war-room'; data: ReturnType<typeof owner>}
  | {kind: 'locations'; data: ReturnType<typeof locations>}
  | {kind: 'manager-action-center'; data: ReturnType<typeof manager>};
let state: FixtureState=kind==='daily-digest'?{kind,data:daily(locale)}:kind==='owner-war-room'?{kind,data:owner(locale)}:kind==='locations'?{kind,data:locations(locale)}:{kind:'manager-action-center',data:manager(locale)};
const container=document.getElementById('root');
if (!container) throw new Error('Command Center fixture root is missing');
const root=createRoot(container);
function render(){
  switch(state.kind){
    case 'daily-digest': root.render(<DailyHabitDigestDashboard data={state.data} locale={locale} followUpEnabled/>); break;
    case 'owner-war-room': root.render(<OwnerWarRoomDashboard data={state.data} locale={locale} followUpEnabled title={locale==='fr'?'Dirigeant':'Owner'} subtitle="Fixture"/>); break;
    case 'locations': root.render(<ManagerLocationActionCenterDashboard data={state.data} locale={locale} followUpEnabled title={locale==='fr'?'Responsable de site':'Location manager'} subtitle="Fixture"/>); break;
    case 'manager-action-center': root.render(<ManagerActionCenterDashboard data={state.data} locale={locale} followUpEnabled title={locale==='fr'?'Centre d’actions du responsable':'Manager Action Center'} subtitle="Fixture"/>); break;
  }
}
fixtureWindow.fixtureCommit=()=>{state=structuredClone(state);render()};
fixtureWindow.fixtureRevoke=()=>{
  state=structuredClone(state);
  switch(state.kind){
    case 'owner-war-room': state.data.proofSubjects=[];state.data.morningBrief.proofSubjects=[];state.data.actionQueue.actionItems=[];state.data.morningBrief.priorityActions=[];break;
    case 'daily-digest': state.data.digests=[];break;
    case 'locations': state.data.bundles=[];state.data.scope.locationIds=[];break;
    case 'manager-action-center': state.data.actionItems=[];state.data.runSheetGroups=[];state.data.commandBrief.primaryAction=null;state.data.summary.total=0;break;
  }
  render();
};
render();

