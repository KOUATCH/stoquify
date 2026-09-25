const fs = require('fs'), path = require('path'), crypto = require('crypto'), ts = require('typescript');
const output = 'what-next/dashboard-user-guide/evidence', dashboard = 'app/[locale]/(dashboard)/dashboard';
const en = JSON.parse(fs.readFileSync('messages/en.json','utf8')), cache = new Map();
const norm = p => p.replaceAll('\\','/');
function walk(d) { return fs.readdirSync(d,{withFileTypes:true}).flatMap(e => ['__tests__','node_modules'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d,e.name)) : [norm(path.join(d,e.name))]); }
function resolve(f,s) { if(!s.startsWith('@/')&&!s.startsWith('.'))return null;const b=s.startsWith('@/')?s.slice(2):norm(path.join(path.dirname(f),s));return [b,...['.tsx','.ts','.jsx','.js','/index.tsx','/index.ts'].map(x=>b+x)].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())||null; }
const get=(o,k)=>k.split('.').reduce((x,s)=>x?.[s],o);
function inspect(file){
 if(cache.has(file))return cache.get(file);
 const source=fs.readFileSync(file,'utf8'), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS), all=[], imports=[],vars=new Map(),funcs={};let namespace='';
 const scan=n=>{all.push(n);ts.forEachChild(n,scan)};scan(ast);const line=n=>ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1;
 for(const n of all){
  if(ts.isImportDeclaration(n)&&n.moduleSpecifier){const names=[];if(n.importClause?.name)names.push(n.importClause.name.text);const b=n.importClause?.namedBindings;if(b&&ts.isNamedImports(b))for(const e of b.elements)names.push(e.name.text);imports.push({spec:n.moduleSpecifier.text,file:resolve(file,n.moduleSpecifier.text),names});}
  if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer)vars.set(n.name.text,n.initializer);
  if(ts.isFunctionDeclaration(n)&&n.name)funcs[n.name.text]={line:line(n),source:n.getText(ast)};
  if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&(ts.isArrowFunction(n.initializer)||ts.isFunctionExpression(n.initializer)))funcs[n.name.text]={line:line(n),source:n.initializer.getText(ast)};
  if(ts.isCallExpression(n)&&/^(useTranslations|getTranslations)$/.test(n.expression.getText(ast))){const a=n.arguments[0];if(a&&ts.isStringLiteral(a))namespace=a.text;else if(a&&ts.isObjectLiteralExpression(a)){const p=a.properties.find(p=>p.name?.getText(ast)==='namespace');if(p&&ts.isStringLiteral(p.initializer))namespace=p.initializer.text;}}
 }
 function value(n,d=0){
  if(!n||d>9)return undefined;
  if(ts.isStringLiteralLike(n)||ts.isNumericLiteral(n))return n.text;
  if(ts.isParenthesizedExpression(n)||ts.isAsExpression(n)||ts.isSatisfiesExpression(n))return value(n.expression,d+1);
  if(ts.isIdentifier(n))return vars.has(n.text)?value(vars.get(n.text),d+1):undefined;
  if(ts.isObjectLiteralExpression(n))return Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(ast).replace(/^['"]|['"]$/g,''),value(p.initializer,d+1)]));
  if(ts.isArrayLiteralExpression(n))return n.elements.map(x=>value(x,d+1));
  if(ts.isElementAccessExpression(n))return value(n.expression,d+1)?.[value(n.argumentExpression,d+1)??'en'];
  if(ts.isPropertyAccessExpression(n))return value(n.expression,d+1)?.[n.name.text]??(n.expression.getText(ast)==='t'?value(vars.get('copy'),d+1)?.en?.[n.name.text]:undefined);
  if(ts.isConditionalExpression(n)){const c=n.condition.getText(ast);if(/locale|language|isFrench/.test(c))return value(/===?\s*["']en/.test(c)?n.whenTrue:n.whenFalse,d+1);return [value(n.whenTrue,d+1),value(n.whenFalse,d+1)].filter(x=>typeof x==='string').join(' / ')||undefined;}
  if(ts.isCallExpression(n)&&/^(t|tr|tCommon|tTable)$/.test(n.expression.getText(ast))&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0]))return get(en,namespace?namespace+'.'+n.arguments[0].text:n.arguments[0].text);
 }
 const text=n=>{if(!n)return '';if(ts.isJsxText(n))return n.text.replace(/\s+/g,' ').trim();if(ts.isJsxExpression(n)){const v=value(n.expression);return typeof v==='string'?v:'';}if(ts.isJsxElement(n)||ts.isJsxFragment(n))return n.children.map(text).filter(Boolean).join(' ');const v=value(n);return typeof v==='string'?v:'';};
 const controls=[],headings=[],jsx=new Set(),props=[],calls=[],strings=[];
 for(const n of all){
  if(ts.isCallExpression(n))calls.push({name:n.expression.getText(ast),line:line(n),args:n.arguments.map(a=>a.getText(ast)).join(', ').slice(0,600)});
  if(ts.isStringLiteral(n)&&n.text.length>2&&n.text.length<250)strings.push(n.text);
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){
   const tag=n.tagName.getText(ast);jsx.add(tag.split('.')[0]);const attrs={};for(const a of n.attributes.properties)if(ts.isJsxAttribute(a))attrs[a.name.getText(ast)]=a.initializer?(ts.isJsxExpression(a.initializer)?a.initializer.expression:a.initializer):null;
   const parent=ts.isJsxElement(n.parent)?n.parent:n,label=text(parent)||text(attrs['aria-label'])||text(attrs.label)||text(attrs.title)||text(attrs.placeholder)||text(attrs.name)||text(attrs.id);
   if(/^h[1-6]$|Title$|TableHead$|FormLabel$|^Label$/.test(tag)&&label)headings.push({kind:tag,label,line:line(n)});
   if(/^(Button|button|Link|a|Input|input|Select|select|Textarea|textarea|Checkbox|Switch|TabsTrigger|DropdownMenuItem|DropdownMenuCheckboxItem|RadioGroupItem|summary)$/.test(tag)){const handlers=Object.fromEntries(Object.entries(attrs).filter(([k])=>/^on|^href$|^type$|^name$|^disabled$|^required$/.test(k)).map(([k,v])=>[k,v?v.getText(ast):'true']));controls.push({tag,label:label||'[dynamic or icon-only label]',line:line(n),handlers,source:parent.getText(ast).slice(0,1800)});}
   for(const k of ['title','description','label','name','placeholder','message']){const v=text(attrs[k]);if(v)props.push({kind:k,label:v,line:line(n)});}
  }
 }
 const jsxImports=imports.filter(i=>i.file&&i.names.some(n=>jsx.has(n))).map(i=>i.file);
 for(const n of all)if(ts.isExportDeclaration(n)&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)){const p=resolve(file,n.moduleSpecifier.text);if(p)jsxImports.push(p);}
 for(const n of all)if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])){const p=resolve(file,n.arguments[0].text);if(p)jsxImports.push(p);}
 const data={file,hash:crypto.createHash('sha256').update(source).digest('hex'),lines:source.split('\n').length,imports,jsxImports,namespace,controls,headings,props,calls,strings:[...new Set(strings)],functions:funcs};cache.set(file,data);return data;
}
function include(f){return (f.endsWith('.tsx')||f.endsWith('/index.ts'))&&!/^components\/ui\/(?!groups\/)/.test(f)&&!f.startsWith('components/dashboard/primitives/')&&!/Providers?/.test(path.basename(f));}
function tree(f,d=0,seen=new Set()){if(d>6||seen.has(f))return seen;seen.add(f);for(const child of inspect(f).jsxImports)if(include(child))tree(child,d+1,seen);return seen;}
const files=walk(dashboard),pages=files.filter(p=>/\/page\.(tsx|ts|jsx|js)$/.test(p));
const entries=pages.map(file=>{const route='/en/dashboard'+file.slice(dashboard.length).replace(/\/page\.(tsx|ts|jsx|js)$/,'').replace(/\/\([^/]+\)/g,''),meta=inspect(file),components=[...tree(file)],dependencies=new Set();for(const f of components)for(const i of inspect(f).imports)if(i.file&&(/^(actions|hooks|services|lib|config)\//.test(i.file)||/route-access|route-data-access/.test(i.file)))dependencies.add(i.file);return {route,file,group:route.split('/')[3]||'dashboard',components,dependencies:[...dependencies],redirects:meta.calls.filter(c=>/redirect/.test(c.name)),controls:components.flatMap(f=>inspect(f).controls.map(c=>({...c,file:f}))),headings:components.flatMap(f=>inspect(f).headings.map(h=>({...h,file:f}))),props:components.flatMap(f=>inspect(f).props.map(h=>({...h,file:f})))};});
for(const e of entries)for(const dep of e.dependencies){const m=inspect(dep);for(const i of m.imports)if(i.file&&i.file.startsWith('services/'))inspect(i.file);}
for(const f of ['components/dashboard/Sidebar.tsx','components/dashboard/Navbar.tsx','components/UserDropdownMenu.tsx','app/[locale]/(dashboard)/dashboard/layout.tsx'])if(fs.existsSync(f))tree(f);
fs.writeFileSync(path.join(output,'source-inventory.json'),JSON.stringify({generatedAt:new Date().toISOString(),pages:entries,files:Object.fromEntries(cache),excluded:files.filter(f=>/page\./.test(f)&&!pages.includes(f)),endpoints:walk('app').filter(f=>/\/route\.(ts|js)$/.test(f))},null,2));
for(const group of [...new Set(entries.map(e=>e.group))])fs.writeFileSync(path.join(output,'brief-'+group+'.txt'),entries.filter(e=>e.group===group).map(e=>`\nROUTE ${e.route}\nFILE ${e.file}\nCOMPONENTS ${e.components.join('; ')}\nDEPENDENCIES ${e.dependencies.join('; ')}\nREDIRECTS ${JSON.stringify(e.redirects)}\nHEADINGS ${e.headings.map(x=>x.label).join(' | ')}\nPROPS ${e.props.map(x=>x.label).slice(0,70).join(' | ')}\nCONTROLS ${e.controls.map(x=>`${x.label} (${x.tag}, ${JSON.stringify(x.handlers)}, ${x.file}:${x.line})`).join('\n')}`).join('\n'));
console.log(JSON.stringify({routes:entries.length,groups:Object.fromEntries([...new Set(entries.map(e=>e.group))].map(g=>[g,entries.filter(e=>e.group===g).length])),files:cache.size,controls:entries.reduce((a,e)=>a+e.controls.length,0)},null,2));
