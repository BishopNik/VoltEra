import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const collections=['leads','reviews','questions','faqs','projects','articles','equipment','solarPanels','greenProtect','quotes','purchases','users'];
const token='a'.repeat(64);
const revokedToken='b'.repeat(64);

async function waitForServer(baseUrl,child,logs){
  for(let attempt=0;attempt<80;attempt+=1){
    if(child.exitCode!==null)throw new Error(`Test server exited with ${child.exitCode}: ${logs.join('')}`);
    try{const response=await fetch(`${baseUrl}/api/public/proposals/${token}`);if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error('Test server did not start');
}

test('public proposal lifecycle is private, idempotent and revocable',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'voltares-proposals-'));
  const dataDirectory=path.join(directory,'data');await mkdir(dataDirectory);
  await Promise.all(['server.mjs','proposal.html'].map(file=>cp(path.join(ROOT,file),path.join(directory,file))));
  const now='2026-07-22T12:00:00.000Z';
  const quote={_id:'proposal-test',number:'KP-TEST-1',customerName:'Іван Петренко',company:'Тест',email:'client@example.com',phone:'+380671234567',city:'Львів',validUntil:'2099-12-31',note:'Оплата після погодження.',items:[{kind:'catalog',collection:'equipment',productId:'deye-test',productSlug:'deye-test',productUrl:'/products/deye-test',name:'Deye Test',description:'Гібридний інвертор',shortDescription:'Гібридний інвертор',image:'/assets/equipment/test.webp',quantity:1,unit:'шт.',unitPrice:2500,total:2500,currency:'USD'}],currency:'USD',subtotal:2500,status:'sent',publicToken:token,publicEnabled:true,sentAt:now,firstViewedAt:null,lastViewedAt:null,viewsCount:0,confirmedAt:null,lastClientActivityAt:null,adminViewedActivityAt:null,previousVersionId:null,nextVersionId:null,version:1,confirmationNotificationSentAt:null,createdBy:'Admin',ownerId:'',purchasePrice:1200,internalNotes:'secret',createdAt:now,updatedAt:now};
  const revoked={...quote,_id:'proposal-revoked',number:'KP-TEST-2',publicToken:revokedToken,publicEnabled:false};
  const fixture=Object.fromEntries(collections.map(name=>[name,name==='quotes'?[quote,revoked]:[]]));fixture._migrations=[];
  await writeFile(path.join(dataDirectory,'db.json'),JSON.stringify(fixture));
  const port=21000+(process.pid%10000);const baseUrl=`http://127.0.0.1:${port}`;
  const logs=[];const child=spawn(process.execPath,['server.mjs'],{cwd:directory,env:{...process.env,PORT:String(port),ADMIN_USER:'admin',ADMIN_PASSWORD:'test-password-123',MONGODB_URI:'',RESEND_API_KEY:''},stdio:['ignore','pipe','pipe']});child.stdout.on('data',chunk=>logs.push(String(chunk)));child.stderr.on('data',chunk=>logs.push(String(chunk)));
  t.after(async()=>{child.kill('SIGTERM');await rm(directory,{recursive:true,force:true});});
  await waitForServer(baseUrl,child,logs);

  const publicResponse=await fetch(`${baseUrl}/api/public/proposals/${token}`);assert.equal(publicResponse.status,200);assert.match(publicResponse.headers.get('x-robots-tag')||'',/noindex/);
  const proposal=await publicResponse.json();assert.equal(proposal.number,'KP-TEST-1');assert.equal(proposal.customer.name,'Іван Петренко');assert.equal(proposal.items[0].productUrl,'/products/deye-test');assert.equal('_id' in proposal,false);assert.equal('email' in proposal.customer,false);assert.equal('purchasePrice' in proposal,false);assert.equal('internalNotes' in proposal,false);

  assert.equal((await fetch(`${baseUrl}/api/public/proposals/${token}/view`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,200);
  const login=await fetch(`${baseUrl}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:'admin',password:'test-password-123'})});assert.equal(login.status,200);const cookie=String(login.headers.get('set-cookie')||'').split(';')[0];
  const employeeProposal=await fetch(`${baseUrl}/api/public/proposals/${token}`,{headers:{Cookie:cookie}});assert.equal(employeeProposal.status,200);assert.equal((await employeeProposal.json()).employeeViewer,true);
  const employeeView=await fetch(`${baseUrl}/api/public/proposals/${token}/view`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:'{}'});assert.equal(employeeView.status,200);assert.equal((await employeeView.json()).employeeViewer,true);
  assert.equal((await fetch(`${baseUrl}/api/public/proposals/${token}/confirm`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:'{}'})).status,409);
  const staleUpdate=await fetch(`${baseUrl}/api/quotes/proposal-test`,{method:'PATCH',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({status:'sent',note:'Оновлено менеджером'})});assert.equal(staleUpdate.status,200);assert.equal((await staleUpdate.json()).status,'viewed');
  const confirmation=await fetch(`${baseUrl}/api/public/proposals/${token}/confirm`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(confirmation.status,200);assert.equal((await confirmation.json()).ok,true);
  const repeated=await fetch(`${baseUrl}/api/public/proposals/${token}/confirm`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(repeated.status,200);assert.equal((await repeated.json()).alreadyConfirmed,true);

  const stored=JSON.parse(await readFile(path.join(dataDirectory,'db.json'),'utf8')).quotes.find(item=>item._id==='proposal-test');assert.equal(stored.status,'confirmed');assert.equal(stored.viewsCount,1);assert.ok(stored.firstViewedAt);assert.ok(stored.confirmedAt);
  assert.equal((await fetch(`${baseUrl}/api/public/proposals/${revokedToken}`)).status,410);
  assert.equal((await fetch(`${baseUrl}/api/public/proposals/not-a-token`)).status,400);
  const page=await fetch(`${baseUrl}/proposal/${token}`);assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag')||'',/noarchive/);const pageHtml=await page.text();assert.match(pageHtml,/<meta name="robots" content="noindex, nofollow, noarchive">/);assert.match(pageHtml,/На сайт Voltares/);assert.match(pageHtml,/proposal-staff-mode/);
});
