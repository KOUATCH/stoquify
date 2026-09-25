import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAPHistoryWorkbench } from "../useAPHistoryWorkbench"
import { getAPHistoryAction } from "@/actions/purchasing/ap-history.actions"
jest.mock("@/actions/purchasing/ap-history.actions", () => ({ getAPHistoryAction: jest.fn() }))
const mockParams = new URLSearchParams(), mockReplace=jest.fn()
jest.mock("next/navigation", () => ({usePathname:()=>'/en/dashboard/purchases/payables/history',useSearchParams:()=>mockParams,useRouter:()=>({replace:mockReplace})}))
function wrapper(client: QueryClient) {return function Wrapper({children}:{children:React.ReactNode}){return <QueryClientProvider client={client}>{children}</QueryClientProvider>}}
const data=(org:string)=>({success:true,data:{scope:{organizationId:org,actorUserId:'actor'},rows:[{id:org}],pageInfo:{hasMore:false}}})
beforeEach(()=>{jest.clearAllMocks(); for (const key of [...mockParams.keys()]) mockParams.delete(key)})

it('opens and closes retained details without reloading rows or losing the current filter and cursor',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{staleTime:60000,retry:false}}})
 mockParams.set('supplierId','s1');mockParams.set('cursor','page-2')
 ;(getAPHistoryAction as jest.Mock).mockResolvedValue(data('a'))
 const view=renderHook(()=>useAPHistoryWorkbench({organizationId:'a',actorId:'actor'}),{wrapper:wrapper(client)})
 await waitFor(()=>expect(view.result.current.rows[0]?.id).toBe('a'))
 act(()=>view.result.current.selectRow('a'))
 const selected=new URL(mockReplace.mock.calls[0][0],'http://localhost')
 expect(selected.searchParams.get('selected')).toBe('a')
 expect(selected.searchParams.get('supplierId')).toBe('s1')
 expect(selected.searchParams.get('cursor')).toBe('page-2')
 expect(mockReplace.mock.calls[0][1]).toEqual({scroll:false})
 mockParams.set('selected','a');view.rerender()
 act(()=>view.result.current.selectRow(null))
 expect(new URL(mockReplace.mock.calls[1][0],'http://localhost').searchParams.has('selected')).toBe(false)
 expect(view.result.current.isLoading).toBe(false)
 expect(view.result.current.rows[0]?.id).toBe('a')
 expect(getAPHistoryAction).toHaveBeenCalledTimes(1)
 view.unmount();client.clear()
})

it('discards the cached first page on stale recovery without evicting another identity',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{staleTime:60000,retry:false}}})
 const firstKey=['ap-history-workbench','a','actor',{pageSize:50}]
 client.setQueryData(firstKey,data('a').data)
 const otherKey=['ap-history-workbench','b','actor',{pageSize:50}]
 client.setQueryData(otherKey,data('b').data)
 mockParams.set('cursor','stale')
 ;(getAPHistoryAction as jest.Mock).mockResolvedValue({success:false,error:'changed',code:'CONFLICT'})
 const view=renderHook(()=>useAPHistoryWorkbench({organizationId:'a',actorId:'actor'}),{wrapper:wrapper(client)})
 await waitFor(()=>expect(view.result.current.isStale).toBe(true))
 act(()=>view.result.current.restartHistory())
 expect(client.getQueryData(firstKey)).toBeUndefined()
 expect(client.getQueryData(otherKey)).toEqual(data('b').data)
 view.unmount();client.clear()
})

it('refetches when recovery already starts on the first page',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{staleTime:60000,retry:false}}})
 ;(getAPHistoryAction as jest.Mock).mockResolvedValueOnce({success:false,error:'changed',code:'CONFLICT'}).mockResolvedValueOnce(data('a'))
 const view=renderHook(()=>useAPHistoryWorkbench({organizationId:'a',actorId:'actor'}),{wrapper:wrapper(client)})
 await waitFor(()=>expect(view.result.current.isStale).toBe(true))
 act(()=>view.result.current.restartHistory())
 await waitFor(()=>expect(view.result.current.rows[0]?.id).toBe('a'))
 expect(getAPHistoryAction).toHaveBeenCalledTimes(2)
 view.unmount();client.clear()
})
it('keeps results for different organizations in separate cache entries',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});(getAPHistoryAction as jest.Mock).mockResolvedValueOnce(data('a')).mockResolvedValueOnce(data('b'))
 const view=renderHook(props=>useAPHistoryWorkbench(props),{initialProps:{organizationId:'a',actorId:'actor'},wrapper:wrapper(client)});await waitFor(()=>expect(view.result.current.rows[0]?.id).toBe('a'));view.rerender({organizationId:'b',actorId:'actor'});expect(view.result.current.rows).toEqual([]);await waitFor(()=>expect(view.result.current.rows[0]?.id).toBe('b'));expect(client.getQueryCache().findAll({queryKey:['ap-history-workbench']}).map(q=>q.queryKey.slice(1,3))).toEqual([['a','actor'],['b','actor']]);view.unmount();client.clear()
})
it('rejects a response from another scope without retrying or displaying its rows',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});(getAPHistoryAction as jest.Mock).mockResolvedValue(data('other'));const view=renderHook(()=>useAPHistoryWorkbench({organizationId:'a',actorId:'actor'}),{wrapper:wrapper(client)});await waitFor(()=>expect(view.result.current.isError).toBe(true));expect(view.result.current.rows).toEqual([]);expect(getAPHistoryAction).toHaveBeenCalledTimes(1);view.unmount();client.clear()
})
it('classifies a stale response without repeated retries and restarts while retaining filters',async()=>{
 mockParams.set('supplierId','s1');mockParams.set('cursor','stale');mockParams.set('dateFrom','2026-08-01')
 const client=new QueryClient();(getAPHistoryAction as jest.Mock).mockResolvedValue({success:false,error:'changed',code:'CONFLICT'});const view=renderHook(()=>useAPHistoryWorkbench({organizationId:'a',actorId:'actor'}),{wrapper:wrapper(client)});await waitFor(()=>expect(view.result.current.isStale).toBe(true));expect(getAPHistoryAction).toHaveBeenCalledTimes(1);act(()=>view.result.current.restartHistory());const next=new URL(mockReplace.mock.calls[0][0],'http://localhost');expect(next.searchParams.has('cursor')).toBe(false);expect(next.searchParams.get('supplierId')).toBe('s1');expect(next.searchParams.get('dateFrom')).toBe('2026-08-01');view.unmount();client.clear();mockParams.delete('supplierId');mockParams.delete('cursor');mockParams.delete('dateFrom')
})
