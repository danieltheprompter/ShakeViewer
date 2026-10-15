import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1280,height:800}});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
let carto=0, cartoOk=0; p.on('response',r=>{if(r.url().includes('basemaps.cartocdn.com')){carto++; if(r.status()===200)cartoOk++;}});
await p.goto('https://shakeviewer.com/',{waitUntil:'networkidle'}); await p.waitForTimeout(3000);
await p.screenshot({path:'/workspace/shakeviewer/screens/live-after-deploy.png'});
console.log(JSON.stringify({carto,cartoOk,errs:errs.slice(0,5)})); await b.close();
