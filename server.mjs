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
const COLLECTIONS = new Set(['leads','reviews','questions','projects','articles','equipment']);

const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json' };

class FileStore {
  constructor(file){ this.file=file; this.data=null; this.queue=Promise.resolve(); }
  async init(){ this.data=JSON.parse(await fs.readFile(this.file,'utf8')); let changed=false; for(const review of this.data.reviews||[]){ if(review.verified===undefined){ review.verified=false; review.verifiedBy=''; review.verifiedAt=null; review.audit=[]; changed=true; } if(!Array.isArray(review.audit)){ review.audit=[]; changed=true; } } if(changed)await this.persist(); }
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
function sanitize(type,input){ const allowed={leads:['name','phone','email','city','object','need','comment','status','manager','viewedAt'],reviews:['name','city','rating','text','reply','status','verified','viewedAt'],questions:['author','city','title','body','status','likes','answers','viewedAt'],projects:['title','city','type','description','image','status'],articles:['title','slug','excerpt','body','category','status','url'],equipment:['brand','model','power','phase','voltage','price','description','status','image']}[type]||[]; return Object.fromEntries(allowed.filter(k=>input[k]!==undefined).map(k=>[k,input[k]])); }
function publicReview(item){ const {audit,viewedAt,verifiedBy,verifiedAt,...safe}=item; return safe; }
function reviewAudit(previous={},next={},user){ const fields=['status','reply','verified']; const changes=fields.filter(field=>String(previous[field]??'')!==String(next[field]??'')); if(!changes.length)return previous.audit || []; const now=new Date().toISOString(); const entries=changes.map(field=>({at:now,user:user.name,role:user.role,action:field==='verified'?'verify-review':'update-review',field,from:previous[field]??null,to:next[field]??null})); return [...(Array.isArray(previous.audit)?previous.audit:[]),...entries]; }

async function api(req,res,url){
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){ const input=await body(req); const adminName=findAdminUser(String(input.user||'')); const ok=adminName&&compareSafe(input.password||'',ADMIN_PASSWORD); if(!ok)return json(res,401,{error:'INVALID_CREDENTIALS'}); const user={name:adminName,role:'admin'}; return json(res,200,{user},{'Set-Cookie':sessionCookie(packSessionCookie({user,expires:Date.now()+28_800_000}))}); }
  if(url.pathname==='/api/auth/me')return currentUser(req)?json(res,200,{user:currentUser(req)}):json(res,401,{error:'AUTH_REQUIRED'});
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){ return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)}); }
  if(url.pathname==='/api/dashboard'){ if(!requireAdmin(req,res))return; const result={}; for(const type of COLLECTIONS){const items=await store.list(type);const hasUnread=['leads','reviews','questions'].includes(type);result[type]={total:items.length,unread:hasUnread?items.filter(x=>!x.viewedAt).length:0};} return json(res,200,result); }
  if(url.pathname==='/api/admin/mark-viewed'&&req.method==='POST'){ if(!requireAdmin(req,res))return; const input=await body(req); if(!COLLECTIONS.has(input.type))return json(res,400,{error:'INVALID_TYPE'}); await store.markViewed(input.type); return json(res,200,{ok:true}); }
  if(url.pathname==='/api/uploads'&&req.method==='POST'){ if(!requireAdmin(req,res))return; const input=await body(req,6_000_000); if(!/^data:image\/(png|jpeg|webp);base64,/.test(input.dataUrl||''))return json(res,400,{error:'INVALID_IMAGE'}); const ext=input.dataUrl.match(/^data:image\/(png|jpeg|webp)/)[1].replace('jpeg','jpg'); const filename=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`; await fs.mkdir(path.join(ROOT,'uploads'),{recursive:true}); await fs.writeFile(path.join(ROOT,'uploads',filename),Buffer.from(input.dataUrl.split(',')[1],'base64')); return json(res,201,{url:`/uploads/${filename}`}); }
  const match=url.pathname.match(/^\/api\/(leads|reviews|questions|projects|articles|equipment)(?:\/([^/]+))?$/); if(!match)return false;
  const [,type,id]=match; const isAdmin=Boolean(currentUser(req));
  if(req.method==='GET'){
    if(type==='leads'&&!isAdmin)return json(res,401,{error:'AUTH_REQUIRED'});
    let items=await store.list(type);
    if(!isAdmin){ if(type==='reviews')items=items.filter(x=>x.status==='published').map(publicReview); if(['projects','articles'].includes(type))items=items.filter(x=>x.status==='published'||x.status==='active'); if(type==='equipment')items=items.filter(x=>x.status==='active'); }
    return json(res,200,id?(items.find(x=>String(x._id)===id)||null):items);
  }
  if(req.method==='POST'){
    if(!['leads','reviews','questions'].includes(type)&&!requireAdmin(req,res))return;
    const input=sanitize(type,await body(req));
    if(type==='leads')Object.assign(input,{status:'new',manager:'',viewedAt:null});
    if(type==='reviews')Object.assign(input,{status:'waiting',reply:'',verified:false,verifiedAt:null,verifiedBy:'',audit:[],viewedAt:null,rating:Number(input.rating||5)});
    if(type==='questions')Object.assign(input,{status:'open',likes:0,answers:[],viewedAt:null});
    const requiredOk = type==='leads' ? input.name : type==='reviews' ? input.name && input.text : type==='questions' ? input.title : type==='equipment' ? input.brand && input.model : input.title;
    if(!requiredOk)return json(res,400,{error:'REQUIRED_FIELDS'});
    return json(res,201,await store.create(type,input));
  }
  if(['PATCH','DELETE'].includes(req.method)){ const user=requireAdmin(req,res); if(!user)return; if(!id)return json(res,400,{error:'ID_REQUIRED'}); if(req.method==='DELETE')return json(res,(await store.remove(type,id))?200:404,{ok:true}); const previous=(await store.list(type)).find(item=>String(item._id)===id); if(!previous)return json(res,404,{error:'NOT_FOUND'}); const input=sanitize(type,await body(req)); if(type==='reviews'){ if(input.verified!==undefined){ input.verified=Boolean(input.verified); input.verifiedAt=input.verified?new Date().toISOString():null; input.verifiedBy=input.verified?user.name:''; } const next={...previous,...input}; input.audit=reviewAudit(previous,next,user); } return json(res,200,await store.update(type,id,input)); }
  return json(res,405,{error:'METHOD_NOT_ALLOWED'});
}

async function serve(req,res,url){
  if(url.pathname==='/admin.html'&&!currentUser(req)){res.writeHead(302,{Location:'/admin-login.html'});return res.end();}
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
