import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('employee marker disables client actions and does not record a view',async()=>{
  const source=await readFile(path.join(ROOT,'proposal.js'),'utf8');
  const elements=new Map();
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{
      hidden:false,disabled:false,textContent:'',innerHTML:'',href:'',
      addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}
    });
    return elements.get(selector);
  };
  const requests=[];
  const token='a'.repeat(64);
  const proposal={number:'KP-TEST',createdAt:'2026-07-23T10:00:00.000Z',validUntil:'2099-12-31',version:1,status:'sent',expired:false,customer:{name:'Клієнт',company:'Компанія'},items:[],subtotal:100,currency:'UAH',manager:{name:'Менеджер'}};
  const storage=new Map([['voltares_home',JSON.stringify({home:true,user:'Admin'})]]);
  const context={
    document:{querySelector:element,title:''},
    location:{pathname:`/proposal/${token}`,search:''},
    localStorage:{getItem:key=>storage.get(key)||null},
    sessionStorage:{getItem:()=>null,setItem(){throw new Error('employee view must not be stored as client view');}},
    fetch:async url=>{requests.push(String(url));return {ok:true,json:async()=>proposal};},
    window:{close(){}},URLSearchParams,Intl,Date,setTimeout,clearTimeout
  };
  vm.runInNewContext(source,context,{filename:'proposal.js'});
  await new Promise(resolve=>setTimeout(resolve,0));

  assert.equal(element('#proposal-close').disabled,true);
  assert.equal(element('#proposal-confirm').disabled,true);
  assert.equal(element('#proposal-staff-mode').hidden,false);
  assert.equal(element('#proposal-actions').hidden,false);
  assert.deepEqual(requests,[`/api/public/proposals/${token}`]);
});
