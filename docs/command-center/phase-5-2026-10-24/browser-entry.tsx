import {createRoot} from 'react-dom/client'
import {useState} from 'react'
import {AssuranceIncidentActions} from '@/components/assurance/AssuranceIncidentActions'
const w=window as any
w.fixtureCalls=[];w.fixtureMessages=[];w.fixtureRefreshes=0;w.fixtureMode='uncertain'
const incident={id:'fixture-incident',assignmentRevision:'a'.repeat(64),checkKey:'ledger.close_exception.review',workflow:'ledger',moduleSlug:'accounting',sourceType:'fixture',sourceHash:'fixture-hash',sourceId:'fixture-source',sourceLabel:'Synthetic source',sourceRoute:'/dashboard/accounting/close',detailRoute:'/dashboard/assurance/incidents/fixture-incident',title:'Synthetic incident',detail:'Synthetic evidence',status:'open',severity:'high',evidenceGrade:'blocked',ownerId:null,ownerRole:'finance',assignedRole:'finance',dueAt:null,canManage:true,redactions:[],blockers:[]}
function Fixture(){const [value,setValue]=useState(incident);w.fixtureRevoke=()=>setValue({...incident,canManage:false,assignmentRevision:'b'.repeat(64)});return <main className="dashboard-landing-theme dark min-h-screen p-6"><h1 className="text-xl text-white">Assignment source fixture</h1><AssuranceIncidentActions incident={value as never} waivers={[]} locale={location.pathname.startsWith('/fr')?'fr':'en'}/></main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
