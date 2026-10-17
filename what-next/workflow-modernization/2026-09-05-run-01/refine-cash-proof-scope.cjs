const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../../..');
function edit(file,work){const target=path.join(root,file),before=fs.readFileSync(target,'utf8'),after=work(before);if(before===after)throw Error('No change');const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,after,{flag:'wx'});fs.renameSync(pending,target);}
edit('components/cash-command/CashCommandDashboard.tsx',s=>s.replace('[data.organizationId, data.generatedAt, data.periodStart, data.periodEnd, locale, data.proofSubjects]','[data.organizationId, data.periodStart, data.periodEnd, locale, data.proofSubjects]'));
edit('components/cash-command/__tests__/CashCommandDashboard.test.tsx',s=>s.replace('  it("withdraws pending proof when current server scope changes",',()=>`  it("preserves proof during a server refresh with unchanged authority and subject scope", async () => {
    action.mockResolvedValueOnce(response("pt-1"))
    const { rerender } = render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("pt-1"))
    rerender(view({ ...buildData(), generatedAt: "2026-06-24T08:00:05.000Z" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("pt-1")
  })

  it("withdraws pending proof when current server scope changes",`));
