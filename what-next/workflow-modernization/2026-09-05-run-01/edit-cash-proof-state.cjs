const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
function edit(file,work){const target=path.join(root,file),before=fs.readFileSync(target,'utf8'),after=work(before);if(before===after)throw Error('No change: '+file);const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,after,{flag:'wx'});fs.renameSync(pending,target);}
edit('components/cash-command/CashCommandDashboard.tsx',source=>{
 source=source.replace('useMemo, useState, useTransition','useEffect, useRef, useState');
 const a=source.indexOf('  const [proofTrail,'),b=source.indexOf('  return (',a);
 source=source.slice(0,a)+`  const [commandMode, setCommandMode] = useState<BICommandMode>(data.commandBrief.mode)
  const t = copy[locale]
  const formatterLocale = locale === "fr" ? "fr-FR" : "en-US"
  const periodLabel = \`\${formatDate(data.periodStart, formatterLocale)} - \${formatDate(data.periodEnd, formatterLocale)}\`
  // Remount synchronously when the server's evidence or authority scope changes.
  const proofScope = JSON.stringify([data.organizationId, data.generatedAt, data.periodStart, data.periodEnd, locale, data.proofSubjects])

`+source.slice(b);
 const c=source.indexOf('            <div className="mt-4 flex flex-wrap gap-2">'),d=source.indexOf('            <BITrustLegend',c);
 if(a<0||b<a||c<0||d<c)throw Error('Missing proof anchors');
 source=source.slice(0,c)+`            <CashProofLinks key={proofScope} subjects={data.proofSubjects} locale={locale} />
`+source.slice(d);
 const marker='function CashTrustBanner({';
 const component=`function CashProofLinks({ subjects, locale }: { subjects: BIProofDrawerSubject[]; locale: "en" | "fr" }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [proofTrail, setProofTrail] = useState<ProofTrailResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  const mounted = useRef(true)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const t = copy[locale]
  const identity = (subject: AvailableProofSubject) => JSON.stringify([subject.organizationId, subject.subjectType, subject.subjectId])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; request.current++ }
  }, [])

  async function open(subject: AvailableProofSubject) {
    const sequence = ++request.current
    setSelected(identity(subject))
    setProofTrail(null)
    setError(null)
    setLoading(true)
    try {
      const response = await getProofTrailAction({ subjectType: subject.subjectType, subjectId: subject.subjectId })
      if (!mounted.current || sequence !== request.current) return
      if (!response.success || response.data.organizationId !== subject.organizationId || response.data.subjectType !== subject.subjectType || response.data.subjectId !== subject.subjectId) {
        throw new Error("Proof response does not match the selected subject")
      }
      setProofTrail(response.data)
    } catch {
      if (mounted.current && sequence === request.current) {
        setError(locale === "fr" ? "La preuve est indisponible. Fermez ce panneau puis rouvrez la preuve pour réessayer." : "Proof is unavailable. Close this panel and reopen the proof to retry.")
      }
    } finally {
      if (mounted.current && sequence === request.current) setLoading(false)
    }
  }

  function close() {
    request.current++
    setSelected(null)
    setProofTrail(null)
    setError(null)
    setLoading(false)
    const button = trigger.current
    // The shared drawer has no SheetTrigger; restore the actual initiating button.
    setTimeout(() => { if (mounted.current && button?.isConnected) button.focus() }, 0)
  }

  return <div className="mt-4 flex flex-wrap gap-2" onClickCapture={event => {
    const button = event.target instanceof Element ? event.target.closest("button") : null
    if (button && event.currentTarget.contains(button)) trigger.current = button
  }}>
    {subjects.map((subject, index) => {
      const active = subject.available && selected === identity(subject)
      return <BIProofDrawerHost key={subject.available ? identity(subject) : subject.label + index}
        subject={subject} proofTrail={active ? proofTrail : null} open={active}
        onOpenChange={value => { if (!value && active) close() }} onOpenSubject={open}
        triggerLabel={t.openProof} loadingLabel={t.loadingProof}
        isLoading={active && loading} error={active ? error : null} />
    })}
  </div>
}

`;
 return source.replace(marker,component+marker);
});
edit('components/cash-command/__tests__/CashCommandDashboard.test.tsx',source=>{
 source=source.replace('import { render, screen }','import { act, fireEvent, render, screen, waitFor }');
 source=source.replace('ProofTrailDrawer: ({ open }: { open: boolean }) => (open ? <div>Proof drawer</div> : null),',`ProofTrailDrawer: ({ open, proofTrail, isLoading, error, onOpenChange }: { open: boolean; proofTrail: { subjectId: string } | null; isLoading: boolean; error: string | null; onOpenChange: (value: boolean) => void }) => (open ? <div role="dialog"><button onClick={() => onOpenChange(false)}>Close proof</button>{isLoading ? "Loading selected proof" : error || proofTrail?.subjectId || "No selected proof"}</div> : null),`);
 source=source.replace('import { CashCommandDashboard }',`import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import { CashCommandDashboard }`);
 source+=`
describe("Cash Command proof request scope", () => {
  const action = jest.mocked(getProofTrailAction)
  const view = (data = buildData(), locale: "en" | "fr" = "en") => <CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />
  const response = (subjectId: string, subjectType = "payment.transaction", organizationId = "org-1") => ({ success: true, data: { organizationId, subjectId, subjectType } }) as Awaited<ReturnType<typeof getProofTrailAction>>
  beforeEach(() => action.mockReset())

  it("opens one drawer and discards a late response after changing subject", async () => {
    let first!: (value: Awaited<ReturnType<typeof getProofTrailAction>>) => void
    action.mockImplementationOnce(() => new Promise(resolve => { first = resolve }))
    action.mockResolvedValueOnce(response("rr-1", "reconciliation.run"))
    render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByRole("dialog")).toHaveTextContent("Loading selected proof")
    fireEvent.click(screen.getByRole("button", { name: "Reconciliation proof" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("rr-1"))
    await act(async () => first(response("pt-1")))
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByRole("dialog")).not.toHaveTextContent("pt-1")
  })

  it.each(["en", "fr"] as const)("catches transport failure, restores focus and retries in %s", async locale => {
    action.mockRejectedValueOnce(new Error("private transport detail"))
    action.mockResolvedValueOnce(response("pt-1"))
    render(view(buildData(), locale))
    const trigger = screen.getByRole("button", { name: "Payment transaction proof" })
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent(locale === "fr" ? "réessayer" : "retry"))
    expect(screen.getByRole("dialog")).not.toHaveTextContent("private transport detail")
    fireEvent.click(screen.getByRole("button", { name: "Close proof" }))
    await waitFor(() => expect(trigger).toHaveFocus())
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("pt-1"))
  })

  it("withdraws pending proof when current server scope changes", async () => {
    let finish!: (value: Awaited<ReturnType<typeof getProofTrailAction>>) => void
    action.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { rerender } = render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    rerender(view({ ...buildData(), proofSubjects: [] }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await act(async () => finish(response("pt-1")))
    expect(screen.queryByText("pt-1")).not.toBeInTheDocument()
  })

  it("rejects a response for another tenant or selected record", async () => {
    action.mockResolvedValueOnce(response("private-proof", "payment.transaction", "org-2"))
    render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("retry"))
    expect(screen.queryByText("private-proof")).not.toBeInTheDocument()
  })
})
`;
 return source;
});
