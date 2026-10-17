import { fireEvent, render, screen } from "@testing-library/react"
import ItemManagement from "../ItemManagement"
jest.mock("next-intl/routing",()=>({defineRouting:(value:unknown)=>value}))
const mockReplace = jest.fn()
const mockRefetch = jest.fn()
const mockSetSearch = jest.fn()
let mockError: Error | null = null
const mockParams = new URLSearchParams()
jest.mock("next/navigation", () => ({usePathname:()=>"/fr/dashboard/inventory/items",useRouter:()=>({replace:mockReplace,push:jest.fn()}),useSearchParams:()=>mockParams}))
jest.mock("@/i18n/navigation", () => ({Link:({children,href,...props}:any)=><a href={href} {...props}>{children}</a>}))
jest.mock("@/hooks/useAllItemQueries", () => ({useOrgItemsNew:()=>({refetch:mockRefetch,isLoading:false,error:mockError}),useDeleteItem:()=>({isPending:false,mutateAsync:jest.fn()})}))
jest.mock("@/hooks/itemsHooks/useItemHooks", () => ({useCreateItem:()=>({isPending:false,mutateAsync:jest.fn()})}))
jest.mock("../ItemForm2", () => ({ItemForm2:()=>null}))
jest.mock("@/lib/notifications/notify",()=>({notify:{success:jest.fn(),error:jest.fn()}}))
jest.mock("xlsx",()=>({utils:{},writeFile:jest.fn()}))
jest.mock("@/components/ui/data-table",()=>({EntityForm:()=>null,ConfirmationDialog:()=>null}))
jest.mock("@/components/DataTableComponents/DateFilters",()=>({__esModule:true,default:()=>null}))
jest.mock("@/components/DataTableComponents/DateRangeFilter",()=>({__esModule:true,default:()=>null}))
jest.mock("@/components/DataTableComponents",()=>({
 inventoryItemsTableContract:{},
 useCanonicalTablePreferences:()=>({columnVisibility:{},columnOrder:[],density:"comfortable",setColumnVisibility:jest.fn(),setColumnOrder:jest.fn(),setDensity:jest.fn()}),
 useCanonicalTableUrlState:()=>({setSearch:mockSetSearch}),
 createCanonicalTableQuery:()=>({}),createCanonicalTableSelection:()=>({}),
 CanonicalTableBoundary:({children}:any)=><section>{children}</section>,CanonicalTableDensityControl:()=>null,
}))
jest.mock("lucide-react", () => {
 const React=require("react")
 return new Proxy({__esModule:true},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>React.createElement("svg",{"aria-hidden":true})})
})
const items = [{id:"item-1",name:"Original product name",sku:"SKU-001",slug:"product",thumbnail:"/item.png",costPrice:12.5,sellingPrice:15,createdAt:new Date("2026-09-19T12:00:00Z"),minStockLevel:1,reorderLevel:1,maxStockLevel:100,inventoryLevels:[{quantityOnHand:4,quantityAvailable:4,quantityReserved:0,totalValue:50,reorderPoint:1}]}] as any
const props = {title:"Articles",organizationId:"org-1",editingId:"",initialItemData:items,initialCategoryData:[],initialBrandData:[],initialUnitData:[],initialTaxRateData:[]}
beforeEach(()=>{jest.clearAllMocks();mockError=null})
it("renders French controls and organization currency while preserving source data",()=>{
 const before=JSON.stringify(items)
 render(<ItemManagement {...props} locale="fr" currency="EUR" />)
 for(const name of ["Nom","Coût","Prix","Date d’ajout","Valeur totale"]) expect(screen.getByRole("button",{name})).toBeInTheDocument()
 expect(screen.getByRole("textbox",{name:"Rechercher des articles"})).toBeInTheDocument()
 expect(screen.getByRole("combobox",{name:"État du stock"})).toHaveTextContent("Tous les stocks")
 expect(screen.getByText("19 sept. 2026")).toBeInTheDocument()
 expect(screen.getByText((text)=>text.replace(/\s/g," ") === "12,50 €")).toBeInTheDocument()
 expect(screen.getByText("4 en stock")).toBeInTheDocument()
 expect(screen.getByRole("link",{name:"Original product name"})).toHaveAttribute("href","/dashboard/inventory/items/item-1")
 expect(JSON.stringify(items)).toBe(before)
})
it("keeps search, clear and selection functional with French labels",()=>{
 render(<ItemManagement {...props} locale="fr" />)
 fireEvent.click(screen.getByRole("checkbox",{name:"Sélectionner la ligne"}))
 expect(screen.getByRole("button",{name:"Exporter la sélection"})).toBeInTheDocument()
 fireEvent.change(screen.getByRole("textbox",{name:"Rechercher des articles"}),{target:{value:"not-found"}})
 expect(screen.getByRole("heading",{name:"Aucun article correspondant"})).toBeInTheDocument()
 fireEvent.click(screen.getByRole("button",{name:"Effacer la recherche d’articles"}))
 expect(screen.getByRole("link",{name:"Original product name"})).toBeInTheDocument()
 expect(mockSetSearch).toHaveBeenCalledWith("not-found")
})
it("preserves English controls and applies the supplied currency",()=>{
 render(<ItemManagement {...props} locale="en" currency="USD" />)
 expect(screen.getByRole("button",{name:"Name"})).toBeInTheDocument()
 expect(screen.getByRole("button",{name:"Refresh"})).toBeInTheDocument()
 expect(screen.getByText("$12.50")).toBeInTheDocument()
})
it("localizes the recoverable read error",()=>{
 mockError=new Error("mocked read failure")
 render(<ItemManagement {...props} locale="fr" />)
 expect(screen.getByText("Chargement des articles impossible")).toBeInTheDocument()
 fireEvent.click(screen.getByRole("button",{name:"Réessayer"}))
 expect(mockRefetch).toHaveBeenCalledTimes(1)
})
