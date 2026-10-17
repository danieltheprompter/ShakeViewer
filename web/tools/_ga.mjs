import { chromium } from 'playwright';
const b=await chromium.launch(); const out='/workspace/sv-web-ga-shots/';
const isGA=u=>/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(u);
async function run(tag,{vp,theme,action,lang='en'}){
  const ctx=await b.newContext({viewport:vp,colorScheme:theme}); await ctx.addInitScript(([l,th])=>{localStorage.setItem('sv_lang',l);},[lang,theme]);
  const pg=await ctx.newPage(); const ga=[]; const errs=[];
  pg.on('request',r=>{if(isGA(r.url()))ga.push(r.url().split('?')[0]);});
  pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/cartocdn|ERR_FAILED/.test(m.text()))errs.push(m.text().slice(0,150));});
  await pg.goto('http://localhost:8787/'); await pg.waitForTimeout(5000);
  await pg.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
  const banner=await pg.locator('#sv-consent').count();
  await pg.screenshot({path:`${out}${tag}-banner.png`});
  let after='';
  if(action){ await pg.locator('#sv-consent .'+action).click(); await pg.waitForTimeout(4000);
    after=`banner after ${await pg.locator('#sv-consent').count()}, stored ${await pg.evaluate(()=>localStorage.getItem('sv_cookie_consent'))}`;
    if(action==='accept'){ await pg.evaluate(()=>window.svTrack('bookmark_add',{synced:false})); await pg.waitForTimeout(3000);}
    await pg.reload(); await pg.waitForTimeout(4000); after+=`, banner on reload ${await pg.locator('#sv-consent').count()}`;
  }
  console.log(tag,'banner',banner,after,'GA requests',ga.length,[...new Set(ga)].join(' '),'errors',errs.length,errs.join('|'));
  await ctx.close();
}
await run('desktop-dark-decline',{vp:{width:1280,height:860},theme:'dark',action:'decline'});
await run('desktop-light-accept',{vp:{width:1280,height:860},theme:'light',action:'accept'});
await run('mobile-dark-ja',{vp:{width:390,height:844},theme:'dark',lang:'ja'});
await run('mobile-light-es',{vp:{width:390,height:844},theme:'light',lang:'es'});
await b.close();
