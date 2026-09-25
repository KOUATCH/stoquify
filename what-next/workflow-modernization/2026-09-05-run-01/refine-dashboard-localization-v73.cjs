const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../..');
const edit=(p,fn)=>{const f=path.join(root,p);fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')))};
edit('components/dashboard/Navbar.tsx',s=>s.replace(/  userRole,\r?\n\}: \{/,'  userRole,\n  locale,\n}: {').replace(/  userRole: string\r?\n/,'  userRole: string\n  locale: "en" | "fr"\n').replace('                No matching modules found.','                {copy.emptySearch}'));
edit('components/dashboard/Sidebar.tsx',s=>s.replace('                    Live','                    {copy.session}').replace('${isSearching ? visibleLinks.length : filteredLinks.length} authorized navigation destinations','${isSearching ? visibleLinks.length : filteredLinks.length} ${copy.modules}').replace('                No modules match your search.','                {copy.emptySearch}'));
const oldFunction=`export function findSidebarActiveContext(links: ISidebarLink[], normalizedPath: string) {
  for (const link of links) {
    const section = sidebarSectionByKey.get(link.section) ?? sidebarSections[0]

    if (isSidebarHrefActive(normalizedPath, link.href)) {
      return { link, child: undefined, section }
    }

    const child = link.dropdownMenu?.find((item) => isSidebarHrefActive(normalizedPath, item.href))

    if (child) {
      return { link, child, section }
    }
  }

  return null
}`;
const newFunction=`export function findSidebarActiveContext(links: ISidebarLink[], normalizedPath: string) {
  let selected: { link: ISidebarLink; child: ISidebarDropdownItem | undefined; section: SidebarSection } | null = null
  let matchedLength = -1
  for (const link of links) {
    const section = sidebarSectionByKey.get(link.section) ?? sidebarSections[0]
    if (link.href && isSidebarHrefActive(normalizedPath, link.href) && link.href.length > matchedLength) {
      selected = { link, child: undefined, section }
      matchedLength = link.href.length
    }
    for (const child of link.dropdownMenu ?? []) {
      if (isSidebarHrefActive(normalizedPath, child.href) && child.href.length > matchedLength) {
        selected = { link, child, section }
        matchedLength = child.href.length
      }
    }
  }
  return selected
}`;
edit('config/sidebar.ts',s=>{const crlf=s.includes('\r\n');const expected=crlf?oldFunction.replaceAll('\n','\r\n'):oldFunction;if(s.split(expected).length!==2)throw Error('Exact sidebar function no longer matches');return s.replace(expected,crlf?newFunction.replaceAll('\n','\r\n'):newFunction)});
console.log('Refined copy and the exact reviewed navigation function; surrounding source preserved.');
