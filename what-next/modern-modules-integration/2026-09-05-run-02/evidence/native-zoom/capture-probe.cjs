"use strict";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {chromium}=require("@playwright/test");
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),"stoquify-zoom-capture-probe-"));
 let context;
 try{
  const extension=path.join(__dirname,"extension");
  context=await chromium.launchPersistentContext(profile,{channel:"chromium",headless:true,viewport:null,args:["--disable-extensions-except="+extension,"--load-extension="+extension,"--window-size=1280,1100"]});
  const worker=context.serviceWorkers()[0]??await context.waitForEvent("serviceworker");
  const page=context.pages()[0];
  await page.route("http://127.0.0.1:39991/native-zoom-capture-probe",route=>route.fulfill({contentType:"text/html",body:'<!doctype html><html><body style="margin:0;background:#16304a;color:white;font:24px sans-serif"><h1>CAPTURE MECHANISM PROBE</h1><p>This is a static test document, not Stoquify evidence.</p><button style="font:24px sans-serif">Visible control</button></body></html>'}));
  await page.goto("http://127.0.0.1:39991/native-zoom-capture-probe");
  const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(tab=>tab.url.includes("39991")).id);
  await worker.evaluate(async id=>{await chrome.tabs.setZoomSettings(id,{mode:"automatic",scope:"per-tab"});await chrome.tabs.setZoom(id,4)},tabId);
  await page.evaluate(async()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const cdp=await context.newCDPSession(page);
  const metrics=await cdp.send("Page.getLayoutMetrics");
  const facts=await page.evaluate(()=>({innerWidth,innerHeight,devicePixelRatio}));
  for(const fromSurface of [true,false]){
   const data=await cdp.send("Page.captureScreenshot",{format:"png",fromSurface,captureBeyondViewport:false});
   const png=Buffer.from(data.data,"base64"),file=path.join(__dirname,"capture-probe-surface-"+fromSurface+".png");
   fs.writeFileSync(file,png);console.log(JSON.stringify({fromSurface,width:png.readUInt32BE(16),height:png.readUInt32BE(20),facts,metrics}));
  }
 }finally{
  if(context)await context.close();
  const p=fs.realpathSync(profile),t=fs.realpathSync(os.tmpdir());
  if(path.dirname(p).toLowerCase()!==t.toLowerCase()||!path.basename(p).startsWith("stoquify-zoom-capture-probe-"))throw Error("Unsafe cleanup target");
  fs.rmSync(p,{recursive:true});
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});
