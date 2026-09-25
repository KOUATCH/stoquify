const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../..');
const edit=(file,changes)=>{const p=path.join(root,file);let s=fs.readFileSync(p,'utf8');for(const [before,after]of changes){if(s.split(before).length!==2)throw Error('Expected one exact replacement: '+file+' '+before);s=s.replace(before,()=>after)}fs.writeFileSync(p,s)};
edit('components/dashboard/Sidebar.tsx',[
 ['  isSidebarHrefActive,','  findSidebarActiveContext,'],
 ['import { useMemo, useRef, useState }','import { useEffect, useMemo, useRef, useState }'],
 ['useState<string | null>(null)','useState<string | null | undefined>(undefined)'],
 ['  const isActiveHref = (href?: string) => isSidebarHrefActive(normalizedPath, href)','  // Resolve selection from all authorized links, not the current search result subset.'],
 ['  const isSearching = searchTerm.trim().length > 0',`  const activeContext = useMemo(
    () => findSidebarActiveContext(filteredLinks, normalizedPath),
    [filteredLinks, normalizedPath],
  )
  const activeHref = activeContext?.child?.href ?? activeContext?.link.href
  const isActiveHref = (href?: string) => Boolean(href && href === activeHref)

  useEffect(() => {
    setOpenDropdownKey(undefined)
  }, [normalizedPath])

  const isSearching = searchTerm.trim().length > 0`],
 ['(openDropdownKey === null && isChildActive)','(openDropdownKey === undefined && isChildActive)'],
 ['aria-current={isMenuItemActive ? "page" : undefined}','aria-current={isMenuItemActive ? (normalizedPath === menuItem.href ? "page" : "location") : undefined}'],
 ['aria-current={isActive ? "page" : undefined}','aria-current={isActive ? (normalizedPath === item.href ? "page" : "location") : undefined}'],
]);
edit('components/dashboard/Navbar.tsx',[
 ['  isSidebarHrefActive,\n',''],
 ['  const pathSegments = pathname','  const activeHref = activeContext?.child?.href ?? activeContext?.link.href\n\n  const pathSegments = pathname'],
 ['const isActive = isSidebarHrefActive(normalizedPath, item.href)','const isActive = item.href === activeHref'],
 ['aria-current={isActive ? "page" : undefined}','aria-current={isActive ? (normalizedPath === item.href ? "page" : "location") : undefined}'],
]);
console.log('Desktop/mobile use the shared authorized destination; active groups can close and reopen.');
