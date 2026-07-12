import http from 'node:http';
import { promises as fs, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
function loadEnvFile(){
  const file=path.join(ROOT,'.env');
  if(!existsSync(file))return;
  for(const line of readFileSync(file,'utf8').split(/\r?\n/)){
    const trimmed=line.trim();
    if(!trimmed||trimmed.startsWith('#'))continue;
    const index=trimmed.indexOf('=');
    if(index<1)continue;
    const key=trimmed.slice(0,index).trim();
    let value=trimmed.slice(index+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    if(process.env[key]===undefined)process.env[key]=value;
  }
}
loadEnvFile();

const PORT = Number(process.env.PORT || 8787);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_USERS = (process.env.ADMIN_USERS || [ADMIN_USER, 'Kostia', 'Pasha'].join(',')).split(',').map(user => user.trim()).filter(Boolean);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'InkAdmin2026!';
const SECRET_KEY = process.env.SECRET_KEY || process.env.SESSION_SECRET || 'dev-only-change-me';
const CONTACT_API_URL = String(process.env.CONTACT_API_URL || '').trim();
const CONTACT_API_TOKEN = String(process.env.CONTACT_API_TOKEN || '').trim();
const CONTACT_API_CHAT_ID = String(process.env.CONTACT_API_CHAT_ID || '').trim();
const TELEGRAM_BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || CONTACT_API_CHAT_ID || '').trim();
const COLLECTIONS = new Set(['leads','reviews','questions','faqs','projects','articles','equipment']);

const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json' };

class FileStore {
  constructor(file){ this.file=file; this.data=null; this.queue=Promise.resolve(); }
  async init(){ this.data=JSON.parse(await fs.readFile(this.file,'utf8')); let changed=false; for(const name of COLLECTIONS){if(!Array.isArray(this.data[name])){this.data[name]=[];changed=true;}} for(const review of this.data.reviews||[]){ if(review.verified===undefined){ review.verified=false; review.verifiedBy=''; review.verifiedAt=null; review.audit=[]; changed=true; } if(!Array.isArray(review.audit)){ review.audit=[]; changed=true; } } if(changed)await this.persist(); }
  async persist(){ const tmp=`${this.file}.tmp`; await fs.writeFile(tmp,JSON.stringify(this.data,null,2)); await fs.rename(tmp,this.file); }
  async list(type){ return [...(this.data[type]||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
  async create(type,payload){ const now=new Date().toISOString(); const item={...payload,_id:crypto.randomUUID(),createdAt:now,updatedAt:now}; if(['leads','reviews','questions'].includes(type)&&item.viewedAt===undefined)item.viewedAt=null; this.data[type].push(item); await this.persist(); return item; }
  async update(type,id,payload){ const item=this.data[type].find(x=>String(x._id)===id); if(!item)return null; Object.assign(item,payload,{updatedAt:new Date().toISOString()}); delete item._id; item._id=id; await this.persist(); return item; }
  async remove(type,id){ const index=this.data[type].findIndex(x=>String(x._id)===id); if(index<0)return false; this.data[type].splice(index,1); await this.persist(); return true; }
  async markViewed(type){ const now=new Date().toISOString(); (this.data[type]||[]).forEach(item=>{if(!item.viewedAt)item.viewedAt=now;}); await this.persist(); }
}

class MongoStore {
  constructor(client,db,ObjectId){ this.client=client; this.db=db; this.ObjectId=ObjectId; }
  async init(){ for(const name of COLLECTIONS) await this.db.collection(name).createIndex({createdAt:-1}); await this.seedDefaults(); await this.db.collection('reviews').updateMany({verified:{$exists:false}},{$set:{verified:false,verifiedBy:'',verifiedAt:null,audit:[]}}); await this.db.collection('reviews').updateMany({audit:{$exists:false}},{$set:{audit:[]}}); }
  async seedDefaults(){ try{ const seed=JSON.parse(await fs.readFile(path.join(ROOT,'data','db.json'),'utf8')); for(const name of COLLECTIONS){ const docs=Array.isArray(seed[name])?seed[name]:[]; for(const doc of docs){ await this.db.collection(name).updateOne({_id:String(doc._id)},{$setOnInsert:{...doc,_id:String(doc._id)}},{upsert:true}); } } }catch(error){ console.warn('Seed skipped:',error.message); } }
  id(id){ try{return new this.ObjectId(id)}catch{return id} }
  clean(doc){ if(!doc)return doc; return {...doc,_id:String(doc._id)}; }
  async list(type){ return (await this.db.collection(type).find({}).sort({createdAt:-1}).toArray()).map(x=>this.clean(x)); }
  async create(type,payload){ const now=new Date().toISOString(); const item={...payload,createdAt:now,updatedAt:now}; if(['leads','reviews','questions'].includes(type)&&item.viewedAt===undefined)item.viewedAt=null; const result=await this.db.collection(type).insertOne(item); return this.clean({...item,_id:result.insertedId}); }
  async update(type,id,payload){ const update={...payload,updatedAt:new Date().toISOString()}; delete update._id; const result=await this.db.collection(type).findOneAndUpdate({_id:this.id(id)},{$set:update},{returnDocument:'after'}); return this.clean(result); }
  async remove(type,id){ return (await this.db.collection(type).deleteOne({_id:this.id(id)})).deletedCount>0; }
  async markViewed(type){ await this.db.collection(type).updateMany({viewedAt:null},{$set:{viewedAt:new Date().toISOString()}}); }
}

async function createStore(){
  if(process.env.MONGODB_URI){
    try{ const {MongoClient,ObjectId}=await import('mongodb'); const client=new MongoClient(process.env.MONGODB_URI); await client.connect(); const store=new MongoStore(client,client.db(process.env.MONGODB_DB||'ink_energy'),ObjectId); await store.init(); console.log('Database: MongoDB'); return store; }
    catch(error){ console.error('MongoDB connection failed, using local store:',error.message); }
  }
  const store=new FileStore(path.join(ROOT,'data','db.json')); await store.init(); console.log('Database: local JSON fallback'); return store;
}
const store = await createStore();

function json(res,status,data,headers={}){ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}); res.end(JSON.stringify(data)); }
function htmlEscape(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function parseCookies(req){ return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(part=>{const i=part.indexOf('=');return [part.slice(0,i).trim(),decodeURIComponent(part.slice(i+1))]})); }
function signToken(token){ return crypto.createHmac('sha256',SECRET_KEY).update(token).digest('base64url'); }
function packSessionCookie(session){ const payload=Buffer.from(JSON.stringify(session)).toString('base64url'); return `${payload}.${signToken(payload)}`; }
function unpackSessionCookie(value=''){ const dot=value.lastIndexOf('.'); if(dot<1)return null; const payload=value.slice(0,dot); const signature=value.slice(dot+1); const expected=signToken(payload); if(signature.length!==expected.length)return null; if(!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null; try{const session=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')); return session.expires>Date.now()?session:null;}catch{return null;} }
function sessionCookie(value,maxAge=28800){ const secure=process.env.NODE_ENV==='production'?'; Secure':''; return `ink_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`; }
function currentUser(req){ return unpackSessionCookie(parseCookies(req).ink_session)?.user || null; }
function requireAdmin(req,res){ const user=currentUser(req); if(!user){json(res,401,{error:'AUTH_REQUIRED'});return null} return user; }
async function body(req,limit=2_500_000){ let size=0,data=''; for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('PAYLOAD_TOO_LARGE');data+=chunk} return data?JSON.parse(data):{}; }
function compareSafe(a='',b=''){ const left=Buffer.from(String(a)); const right=Buffer.from(String(b)); if(left.length!==right.length)return false; return crypto.timingSafeEqual(left,right); }
function findAdminUser(inputUser=''){ return ADMIN_USERS.find(user=>compareSafe(inputUser,user)) || null; }
function sanitize(type,input){ const allowed={leads:['name','phone','email','city','object','need','comment','status','manager','checkedBy','viewedAt'],reviews:['name','city','rating','text','reply','status','verified','viewedAt'],questions:['author','city','title','status','likes','answers','viewedAt'],faqs:['question','answer','status','order'],projects:['title','city','type','description','image','images','status'],articles:['title','slug','excerpt','body','category','status','image','images'],equipment:['brand','model','power','phase','voltage','price','description','status','image','images']}[type]||[]; return Object.fromEntries(allowed.filter(k=>input[k]!==undefined).map(k=>[k,input[k]])); }
function publicReview(item){ const {audit,viewedAt,verifiedBy,verifiedAt,...safe}=item; return safe; }
function reviewAudit(previous={},next={},user){ const fields=['status','reply','verified']; const changes=fields.filter(field=>String(previous[field]??'')!==String(next[field]??'')); if(!changes.length)return previous.audit || []; const now=new Date().toISOString(); const entries=changes.map(field=>({at:now,user:user.name,role:user.role,action:field==='verified'?'verify-review':'update-review',field,from:previous[field]??null,to:next[field]??null})); return [...(Array.isArray(previous.audit)?previous.audit:[]),...entries]; }

function notificationText(type,item){
  const lines={
    leads:['Нова заявка',item.name,item.phone,item.need||item.object,item.city,item.comment],
    reviews:['Новий відгук',item.name,item.city,item.text],
    questions:['Нове питання',item.author,item.city,item.title,item.body]
  }[type]||['Новий запис',type];
  return lines.filter(Boolean).map(value=>String(value).trim()).filter(Boolean).join('\n');
}
async function sendContactNotification(type,item){
  if(!['leads','reviews','questions'].includes(type))return;
  const directTelegram=TELEGRAM_BOT_TOKEN&&TELEGRAM_CHAT_ID;
  if(!CONTACT_API_URL&&!directTelegram)return;
  const message=notificationText(type,item);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),5000);
  try{
    const target=CONTACT_API_URL||`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload=CONTACT_API_URL?{event:`ink.${type}.created`,title:message.split('\n')[0],message,text:message,chatId:CONTACT_API_CHAT_ID||TELEGRAM_CHAT_ID||undefined,payload:item,createdAt:new Date().toISOString()}:{chat_id:TELEGRAM_CHAT_ID,text:message,disable_web_page_preview:true};
    const response=await fetch(target,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...(CONTACT_API_URL&&CONTACT_API_TOKEN?{Authorization:`Bearer ${CONTACT_API_TOKEN}`}:{})},body:JSON.stringify(payload)});
    if(!response.ok)console.error(`Notification delivery failed: ${response.status}`);
  }catch(error){console.error('Notification delivery failed:',error.message)}finally{clearTimeout(timeout)}
}

async function api(req,res,url){
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){ const input=await body(req); const adminName=findAdminUser(String(input.user||'')); const ok=adminName&&compareSafe(input.password||'',ADMIN_PASSWORD); if(!ok)return json(res,401,{error:'INVALID_CREDENTIALS'}); const user={name:adminName,role:'admin'}; return json(res,200,{user},{'Set-Cookie':sessionCookie(packSessionCookie({user,expires:Date.now()+28_800_000}))}); }
  if(url.pathname==='/api/auth/me')return currentUser(req)?json(res,200,{user:currentUser(req)}):json(res,401,{error:'AUTH_REQUIRED'});
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){ return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)}); }
  if(url.pathname==='/api/integrations/status'){ if(!requireAdmin(req,res))return; return json(res,200,{contactApi:Boolean(CONTACT_API_URL),telegram:Boolean(TELEGRAM_BOT_TOKEN&&TELEGRAM_CHAT_ID),notifications:Boolean(CONTACT_API_URL||(TELEGRAM_BOT_TOKEN&&TELEGRAM_CHAT_ID))}); }
  if(url.pathname==='/api/dashboard'){ if(!requireAdmin(req,res))return; const result={}; for(const type of COLLECTIONS){const items=await store.list(type);const hasUnread=['leads','reviews','questions'].includes(type);result[type]={total:items.length,unread:hasUnread?items.filter(x=>!x.viewedAt).length:0};} return json(res,200,result); }
  if(url.pathname==='/api/admin/mark-viewed'&&req.method==='POST'){ if(!requireAdmin(req,res))return; const input=await body(req); if(!COLLECTIONS.has(input.type))return json(res,400,{error:'INVALID_TYPE'}); await store.markViewed(input.type); return json(res,200,{ok:true}); }
  if(url.pathname==='/api/uploads'&&req.method==='POST'){ if(!requireAdmin(req,res))return; const input=await body(req,6_000_000); if(!/^data:image\/(png|jpeg|webp);base64,/.test(input.dataUrl||''))return json(res,400,{error:'INVALID_IMAGE'}); if(process.env.VERCEL)return json(res,201,{url:input.dataUrl}); const ext=input.dataUrl.match(/^data:image\/(png|jpeg|webp)/)[1].replace('jpeg','jpg'); const filename=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`; await fs.mkdir(path.join(ROOT,'uploads'),{recursive:true}); await fs.writeFile(path.join(ROOT,'uploads',filename),Buffer.from(input.dataUrl.split(',')[1],'base64')); return json(res,201,{url:`/uploads/${filename}`}); }
  const match=url.pathname.match(/^\/api\/(leads|reviews|questions|faqs|projects|articles|equipment)(?:\/([^/]+))?$/); if(!match)return false;
  const [,type,id]=match; const adminUser=currentUser(req); const isAdmin=Boolean(adminUser);
  if(req.method==='GET'){
    if(type==='leads'&&!isAdmin)return json(res,401,{error:'AUTH_REQUIRED'});
    let items=await store.list(type);
    if(!isAdmin){ if(type==='reviews')items=items.filter(x=>x.status==='published').map(publicReview); if(['projects','articles'].includes(type))items=items.filter(x=>x.status==='published'||x.status==='active'); if(type==='equipment')items=items.filter(x=>x.status==='active'); if(type==='faqs')items=items.filter(x=>x.status==='active').sort((a,b)=>Number(a.order||0)-Number(b.order||0)); }
    return json(res,200,id?(items.find(x=>String(x._id)===id)||null):items);
  }
  if(req.method==='POST'){
    if(!['leads','reviews','questions'].includes(type)&&!requireAdmin(req,res))return;
    const input=sanitize(type,await body(req));
    if(type==='leads')Object.assign(input,{status:input.status||'new',manager:input.manager||'',checkedBy:input.checkedBy||'',viewedAt:null});
    if(type==='reviews')Object.assign(input,{status:'waiting',reply:'',verified:false,verifiedAt:null,verifiedBy:'',audit:[],viewedAt:null,rating:Number(input.rating||5)});
    if(type==='questions'){
      if(isAdmin){
        input.answers=Array.isArray(input.answers)?input.answers.filter(answer=>answer&&String(answer.text||'').trim()).map(answer=>({author:String(answer.author||adminUser?.name||'ІНК'),role:'engineer',text:String(answer.text).trim(),createdAt:answer.createdAt||new Date().toISOString()})):[];
        input.status=input.answers.length?'answered':'open';
        input.likes=Number(input.likes||0);
        input.viewedAt=new Date().toISOString();
      }else Object.assign(input,{status:'open',likes:0,answers:[],viewedAt:null});
    }
    const requiredOk = type==='leads' ? input.name && input.phone : type==='reviews' ? input.name && input.text : type==='questions' ? input.title : type==='faqs' ? input.question && input.answer : type==='equipment' ? input.brand && input.model : input.title;
    if(!requiredOk)return json(res,400,{error:'REQUIRED_FIELDS'});
    const created=await store.create(type,input);
    await sendContactNotification(type,created);
    return json(res,201,created);
  }
  if(['PATCH','DELETE'].includes(req.method)){ const user=requireAdmin(req,res); if(!user)return; if(!id)return json(res,400,{error:'ID_REQUIRED'}); if(req.method==='DELETE')return json(res,(await store.remove(type,id))?200:404,{ok:true}); const previous=(await store.list(type)).find(item=>String(item._id)===id); if(!previous)return json(res,404,{error:'NOT_FOUND'}); const input=sanitize(type,await body(req)); if(type==='reviews'){ if(input.verified!==undefined){ input.verified=Boolean(input.verified); input.verifiedAt=input.verified?new Date().toISOString():null; input.verifiedBy=input.verified?user.name:''; } const next={...previous,...input}; input.audit=reviewAudit(previous,next,user); } return json(res,200,await store.update(type,id,input)); }
  return json(res,405,{error:'METHOD_NOT_ALLOWED'});
}

async function serve(req,res,url){
  if(url.pathname==='/admin.html'&&!currentUser(req)){res.writeHead(302,{Location:'/admin-login.html'});return res.end();}
  if(url.pathname==='/sitemap.xml'){
    const fixed=['/','/?lang=en','/rishennia/invertor-dlia-domu.html','/rishennia/rezervne-zhyvlennia-dlia-biznesu.html','/rishennia/soniachni-paneli.html','/articles/5-pryladiv-iaki-zidaiut-avtonomnist.html','/gallery.html','/community.html'];
    const dynamic=(await store.list('articles')).filter(item=>item.status==='published'&&item.slug).map(item=>({path:`/articles/${encodeURIComponent(item.slug)}.html`,updated:item.updatedAt||item.createdAt}));
    const entries=[...fixed.map(pathname=>({path:pathname,updated:'2026-07-12'})),...dynamic].filter((item,index,array)=>array.findIndex(other=>other.path===item.path)===index);
    const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(item=>`\n  <url><loc>https://volt-era.vercel.app${htmlEscape(item.path)}</loc><lastmod>${htmlEscape(String(item.updated||'').slice(0,10))}</lastmod></url>`).join('')}\n</urlset>`;
    res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'});return res.end(xml);
  }
  const articleMatch=url.pathname.match(/^\/articles\/([^/]+)\.html$/);
  if(articleMatch&&!existsSync(path.join(ROOT,url.pathname))){
    const slug=decodeURIComponent(articleMatch[1]);
    const article=(await store.list('articles')).find(item=>item.slug===slug&&(item.status==='published'||item.status==='active'));
    if(!article)return json(res,404,{error:'NOT_FOUND'});
    const images=(Array.isArray(article.images)&&article.images.length?article.images:[article.image]).filter(Boolean);
    const paragraphs=String(article.body||article.excerpt||'').split(/\n{2,}/).filter(Boolean).map(text=>`<p>${htmlEscape(text).replace(/\n/g,'<br>')}</p>`).join('');
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(article.title)} | ІНК</title><meta name="description" content="${htmlEscape(article.excerpt||article.title)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://volt-era.vercel.app/articles/${encodeURIComponent(slug)}.html"><link rel="stylesheet" href="/content-pages.css"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.excerpt||'',image:images,datePublished:article.createdAt,dateModified:article.updatedAt,author:{'@type':'Organization',name:'ІНК'},publisher:{'@type':'Organization',name:'ІНК',logo:{'@type':'ImageObject',url:'https://volt-era.vercel.app/assets/brand/ink-logo-transparent.png'}}}).replace(/</g,'\\u003c')}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="ІНК — головна"></a><nav class="page-nav"><a href="/#journal">Журнал</a><a href="/gallery.html">Галерея</a><a href="/#contacts">Контакти</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><section class="page-hero"><div class="page-container"><p class="page-eyebrow">${htmlEscape(article.category||'Журнал')}</p><h1>${htmlEscape(article.title)}</h1><p class="page-lead">${htmlEscape(article.excerpt||'')}</p></div></section><div class="page-container article-layout"><aside class="article-aside"><a href="/">← На головну</a><a href="/#journal">Інші статті</a></aside><article class="article-content">${images.map(src=>`<img src="${htmlEscape(src)}" alt="${htmlEscape(article.title)}" loading="lazy" style="width:100%;margin:0 0 24px;border-radius:22px">`).join('')}${paragraphs}<a class="page-button" href="/#consultation">Поставити питання →</a></article></div></main><footer class="page-footer"><div class="page-container">© 2026 ІНК · Енергетичні рішення</div></footer></body></html>`;
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300'});return res.end(page);
  }
  let pathname=url.pathname==='/'?'/index.html':url.pathname;
  const requested=path.resolve(ROOT,`.${decodeURIComponent(pathname)}`);
  if(!requested.startsWith(ROOT)||requested.includes(`${path.sep}.`))return json(res,403,{error:'FORBIDDEN'});
  try{const stat=await fs.stat(requested);if(stat.isDirectory())pathname=path.join(pathname,'index.html');const file=stat.isDirectory()?path.join(requested,'index.html'):requested;const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.html')?'no-cache':'public, max-age=3600'});res.end(data);}catch{json(res,404,{error:'NOT_FOUND'});}
}

export async function handleRequest(req,res){ try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/')){const handled=await api(req,res,url);if(handled===false)json(res,404,{error:'API_NOT_FOUND'});return;}await serve(req,res,url);}catch(error){console.error(error);json(res,error.message==='PAYLOAD_TOO_LARGE'?413:500,{error:error.message||'SERVER_ERROR'});} }
export default handleRequest;

if(!process.env.VERCEL && process.argv[1]===fileURLToPath(import.meta.url)){
  const server=http.createServer(handleRequest);
  server.listen(PORT,()=>console.log(`INK Energy: http://127.0.0.1:${PORT}`));
}
