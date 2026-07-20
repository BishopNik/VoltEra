(()=>{
  'use strict';
  const config=window.VOLTA_ANALYTICS_CONFIG||{};
  const CONSENT_KEY='voltares_analytics_consent_v1';
  const FIRST_SOURCE_KEY='voltares_first_source_v1';
  const SESSION_SOURCE_KEY='voltares_session_source_v1';
  const deniedKeys=new Set(['name','phone','email','message','comment','text','author','city','contact']);
  const state={consent:null,ga4Loaded:false,ga4ConsentGranted:false,ga4PageViewSent:false,clarityLoaded:false,initialTracked:false,lastLeadAt:0,startedForms:new WeakSet(),calculators:new WeakSet(),viewedProducts:new Set(),catalogEngagementTracked:false,lastSearch:'',debug:Boolean(config.debug)};
  const safeStorage={get(store,key){try{return store.getItem(key)}catch{return null}},set(store,key,value){try{store.setItem(key,value)}catch{}},remove(store,key){try{store.removeItem(key)}catch{}}};
  const cleanValue=value=>typeof value==='string'?value.slice(0,160):typeof value==='number'&&Number.isFinite(value)?value:typeof value==='boolean'?value:undefined;
  function cleanParams(params={}){
    const clean={};
    for(const [key,value] of Object.entries(params||{})){
      if(deniedKeys.has(String(key).toLowerCase()))continue;
      const safe=cleanValue(value);
      if(safe!==undefined&&safe!=='')clean[key]=safe;
    }
    clean.page_location=`${location.origin}${location.pathname}`;
    return clean;
  }
  function pageContext(){
    const product=location.pathname.match(/^\/products\/([^/]+)/);
    const category=location.pathname.match(/^\/obladnannia\/([^/.]+)/);
    const type=product?'product':location.pathname==='/catalog.html'?'catalog':category?'category':location.pathname==='/faq.html'?'faq':location.pathname==='/calculators.html'?'calculator':location.pathname.startsWith('/articles/')?'article':location.pathname==='/'?'home':'content';
    const query=new URLSearchParams(location.search);const medium=String(query.get('utm_medium')||'').toLowerCase();const landing=query.get('gclid')||/(cpc|ppc|paid)/.test(medium)?'paid':query.get('utm_source')?'campaign':document.referrer?'referral':'direct';
    return{page_type:type,product_slug:product?.[1]||'',product_category:category?.[1]||(product?document.querySelector('.page-eyebrow')?.textContent?.split('·')[0].trim().toLowerCase()||'':''),traffic_landing_type:landing};
  }
  function clarityEvent(name,params){
    if(!state.clarityLoaded||typeof window.clarity!=='function')return;
    try{for(const [key,value] of Object.entries({...pageContext(),...params}))window.clarity('set',key,String(value));window.clarity('event',name)}catch{}
  }
  function trackEvent(name,params={}){
    if(state.consent!=='accepted')return false;
    const clean=cleanParams({...pageContext(),...params});
    if(state.debug)console.info('[analytics]',name,clean);
    try{if(state.ga4Loaded&&typeof window.gtag==='function')window.gtag('event',name,clean)}catch{}
    const clarityNames={view_item:'product_view',open_product_modal:'product_modal_open',form_start:'lead_form_start',form_submit:'lead_form_submit',generate_lead:'lead_form_submit',calculator_complete:'calculator_complete',phone_click:'phone_click',telegram_click:'messenger_click',viber_click:'messenger_click',whatsapp_click:'messenger_click',view_item_list:'category_view'};
    clarityEvent(clarityNames[name]||name,clean);
    window.dispatchEvent(new CustomEvent('voltares:analytics-event',{detail:{name,params:clean}}));
    return true;
  }
  function loadScript(src,id){
    if(document.getElementById(id))return;
    const script=document.createElement('script');script.id=id;script.async=true;script.src=src;script.onerror=()=>state.debug&&console.info(`[analytics] blocked: ${id}`);document.head.append(script);
  }
  function googleConsent(analyticsStorage){
    return{analytics_storage:analyticsStorage,ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted'};
  }
  function loadGoogleTag(){
    if(!config.ga4MeasurementId||state.ga4Loaded)return;
    const granted=state.consent==='accepted';
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    window.gtag('consent','default',{...googleConsent(granted?'granted':'denied'),wait_for_update:500});
    window.gtag('js',new Date());
    window.gtag('config',config.ga4MeasurementId,{debug_mode:state.debug,send_page_view:granted,anonymize_ip:true});
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4MeasurementId)}`,'voltares-ga4');
    state.ga4Loaded=true;state.ga4ConsentGranted=granted;state.ga4PageViewSent=granted;
  }
  function loadProviders(){
    if(state.consent!=='accepted')return;
    loadGoogleTag();
    if(state.ga4Loaded&&!state.ga4ConsentGranted){
      window.gtag('consent','update',googleConsent('granted'));state.ga4ConsentGranted=true;
      if(!state.ga4PageViewSent){window.gtag('event','page_view',cleanParams(pageContext()));state.ga4PageViewSent=true}
    }
    if(config.clarityProjectId&&!state.clarityLoaded){
      window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};loadScript(`https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`,'voltares-clarity');state.clarityLoaded=true;
    }
    persistFirstSource();trackInitialPage();
  }
  function currentSource(){
    const query=new URLSearchParams(location.search);const result={};
    for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid']){const value=query.get(key);if(value)result[key]=value.slice(0,160)}
    result.landing_page=location.pathname;
    if(document.referrer){try{const ref=new URL(document.referrer);if(ref.origin!==location.origin)result.referrer=ref.href.slice(0,500)}catch{}}
    return result;
  }
  function captureSource(){
    const now=currentSource();const existing=safeStorage.get(sessionStorage,SESSION_SOURCE_KEY);let data={first:now,last:now};
    if(existing)try{data={first:JSON.parse(existing).first||now,last:now}}catch{}
    safeStorage.set(sessionStorage,SESSION_SOURCE_KEY,JSON.stringify(data));
    return data;
  }
  function persistFirstSource(){
    const session=safeStorage.get(sessionStorage,SESSION_SOURCE_KEY);if(!session||safeStorage.get(localStorage,FIRST_SOURCE_KEY))return;
    try{safeStorage.set(localStorage,FIRST_SOURCE_KEY,JSON.stringify(JSON.parse(session).first||{}))}catch{}
  }
  function getAttribution(){
    let session={};try{session=JSON.parse(safeStorage.get(sessionStorage,SESSION_SOURCE_KEY)||'{}')}catch{}
    let first=session.first||{};if(state.consent==='accepted')try{first=JSON.parse(safeStorage.get(localStorage,FIRST_SOURCE_KEY)||'{}')||first}catch{}
    return{first_source:first,last_source:session.last||{}};
  }
  function resultRange(form){
    const value=parseFloat(form.querySelector('[data-result]')?.textContent?.replace(',','.'));
    if(!Number.isFinite(value))return'unknown';
    if(value<3)return'low';if(value<10)return'medium';if(value<30)return'high';return'very_high';
  }
  function trackInitialPage(){
    if(state.initialTracked)return;state.initialTracked=true;const context=pageContext();
    if(context.page_type==='product'){state.viewedProducts.add(context.product_slug);trackEvent('view_item',context);trackEvent('view_full_product_page',context)}
    else if(['catalog','category'].includes(context.page_type))trackEvent('view_item_list',context);
    else if(context.page_type==='faq')trackEvent('faq_view',context);
    else if(context.page_type==='calculator')trackEvent('calculator_view',context);
    else if(context.page_type==='article')trackEvent('article_view',context);
  }
  function renderConsent(){
    if(document.getElementById('analytics-consent'))return;
    const style=document.createElement('style');style.id='analytics-consent-style';style.textContent=`.analytics-consent{position:fixed;z-index:99999;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;padding:20px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:#07110f;color:#f4f2e9;box-shadow:0 18px 60px rgba(0,0,0,.4);font:15px/1.5 system-ui,sans-serif}.analytics-consent[hidden]{display:none}.analytics-consent strong{display:block;font-size:18px;margin-bottom:6px}.analytics-consent p{margin:0 0 14px;color:#c4cbc7}.analytics-consent a{color:#d6a448}.analytics-consent-actions{display:flex;gap:9px;flex-wrap:wrap}.analytics-consent button{border:1px solid #66706b;border-radius:999px;padding:10px 16px;background:transparent;color:inherit;font-weight:700;cursor:pointer}.analytics-consent [data-consent=accept]{background:#d7ff3f;border-color:#d7ff3f;color:#07110f}.analytics-consent-details{margin-top:14px;padding-top:12px;border-top:1px solid #35403b}.analytics-preferences{position:fixed;z-index:9998;left:12px;bottom:12px;padding:8px 11px;border:1px solid rgba(128,128,128,.35);border-radius:999px;background:#07110f;color:#f4f2e9;font:12px system-ui,sans-serif;cursor:pointer}@media(max-width:560px){.analytics-consent{left:10px;right:10px;bottom:10px;padding:17px}.analytics-consent-actions{display:grid;grid-template-columns:1fr 1fr}.analytics-consent [data-consent=manage]{grid-column:1/-1}}`;
    document.head.append(style);
    const banner=document.createElement('section');banner.id='analytics-consent';banner.className='analytics-consent';banner.setAttribute('role','dialog');banner.setAttribute('aria-label','Налаштування аналітики');banner.innerHTML=`<strong>Аналітика та приватність</strong><p>Необов’язкова аналітика допомагає покращувати сайт. Вимірювання GA4 і Microsoft Clarity активуються лише після вашої згоди. <a href="/privacy.html">Докладніше</a>.</p><div class="analytics-consent-actions"><button type="button" data-consent="accept">Прийняти аналітику</button><button type="button" data-consent="decline">Відхилити</button><button type="button" data-consent="manage" aria-expanded="false">Налаштувати</button></div><p class="analytics-consent-details" hidden>До вашого вибору Google Tag працює з analytics_storage=denied без аналітичних cookies. Імена, телефони, email і тексти повідомлень не передаються в аналітику.</p>`;
    document.body.append(banner);
    const preferences=document.createElement('button');preferences.type='button';preferences.className='analytics-preferences';preferences.textContent='Налаштування cookies';preferences.hidden=state.consent===null;document.body.append(preferences);
    banner.addEventListener('click',event=>{const action=event.target.closest('[data-consent]')?.dataset.consent;if(action==='manage'){const details=banner.querySelector('.analytics-consent-details');details.hidden=!details.hidden;event.target.setAttribute('aria-expanded',String(!details.hidden));return}if(action==='accept'||action==='decline')setConsent(action==='accept'?'accepted':'declined')});
    preferences.addEventListener('click',()=>{banner.hidden=false;preferences.hidden=true});
    banner.hidden=state.consent!==null;preferences.hidden=state.consent===null;
  }
  function setConsent(value){
    const previous=state.consent;state.consent=value;safeStorage.set(localStorage,CONSENT_KEY,value);const banner=document.getElementById('analytics-consent');const preferences=document.querySelector('.analytics-preferences');if(banner)banner.hidden=true;if(preferences)preferences.hidden=false;
    if(value==='accepted')loadProviders();
    else if(previous==='accepted'){try{window.gtag?.('consent','update',googleConsent('denied'))}catch{}location.reload()}
  }
  function maskForms(root=document){root.querySelectorAll?.('form,input,textarea,select').forEach(element=>element.setAttribute('data-clarity-mask','true'))}
  function bindInteractions(){
    maskForms();new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)maskForms(node)}))).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('focusin',event=>{const form=event.target.closest('form');if(form&&!state.startedForms.has(form)){state.startedForms.add(form);trackEvent('form_start',{form_name:form.id||form.className||'form'})}const calculator=event.target.closest('.calculator-card');if(calculator&&!state.calculators.has(calculator)){state.calculators.add(calculator);trackEvent('calculator_start',{calculator_type:calculator.id})}});
    let calculatorTimer=0;document.addEventListener('change',event=>{const calculator=event.target.closest('.calculator-card');if(!calculator)return;clearTimeout(calculatorTimer);calculatorTimer=setTimeout(()=>trackEvent('calculator_complete',{calculator_type:calculator.id,result_range:resultRange(calculator),equipment_category:calculator.id==='inverter-calculator'?'inverters':'batteries'}),700)});
    let searchTimer=0;document.addEventListener('input',event=>{if(event.target.id!=='catalog-search')return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const length=event.target.value.trim().length;if(length&&event.target.value!==state.lastSearch){state.lastSearch=event.target.value;trackEvent('view_search_results',{search_term_length:length})}},800)});
    document.addEventListener('click',event=>{if(event.target.closest('.product-media,.catalog-product-media'))trackEvent('product_image_click',pageContext());const target=event.target.closest('a,button');if(!target)return;const href=target.getAttribute('href')||'';if(href.startsWith('tel:'))trackEvent('phone_click',{link_location:location.pathname});else if(href.startsWith('mailto:'))trackEvent('email_click');else if(/t\.me/.test(href))trackEvent('telegram_click');else if(/viber:/.test(href))trackEvent('viber_click');else if(/wa\.me|whatsapp/.test(href))trackEvent('whatsapp_click');if(target.matches('.catalog-card,.equipment-card,[data-equipment-id]')){const slug=target.dataset.id||target.dataset.equipmentId||'';state.viewedProducts.add(slug);trackEvent('select_item',{product_slug:slug});trackEvent('open_product_modal',{product_slug:slug});if(state.viewedProducts.size>=3&&!state.catalogEngagementTracked){state.catalogEngagementTracked=true;trackEvent('engaged_catalog',{products_viewed:state.viewedProducts.size})}}if(target.closest('.related-block')&&href.startsWith('/products/'))trackEvent('related_product_click',{product_slug:href.split('/').filter(Boolean).pop()});if(pageContext().page_type==='article'&&href.startsWith('/products/'))trackEvent('article_product_click',{product_slug:href.split('/').filter(Boolean).pop()});if(/\.pdf(?:$|\?)/i.test(href))trackEvent('download_product_document',{document_type:'pdf'});if(href.includes('#contacts'))trackEvent('contact_view',{trigger:'link'});if(target.closest('.knowledge-links')&&location.pathname==='/calculators.html')trackEvent('calculator_cta_click',{calculator_type:'page'});if(href.includes('#consultation'))trackEvent('request_consultation',{cta_location:location.pathname});});
  }
  function wrapFetch(){
    if(window.fetch.__voltaresAnalytics)return;const original=window.fetch.bind(window);
    const wrapped=async(input,init={})=>{
      let requestInit=init;const url=typeof input==='string'?input:input?.url||'';const isLead=/\/api\/leads(?:\?|$)/.test(url)&&String(init.method||'GET').toUpperCase()==='POST';let leadMeta={};
      if(isLead&&typeof init.body==='string')try{const payload=JSON.parse(init.body);payload.attribution=getAttribution();leadMeta={lead_type:String(payload.need||payload.object||'consultation').slice(0,80),form_name:payload.object?'lead_form':'consultation_form',product_slug:(String(payload.need||'').match(/[a-z0-9]+(?:-[a-z0-9]+){2,}/i)||[])[0]||''};requestInit={...init,body:JSON.stringify(payload)}}catch{}
      try{const response=await original(input,requestInit);if(isLead){const now=Date.now();if(response.ok&&now-state.lastLeadAt>1500){state.lastLeadAt=now;trackEvent('form_submit',leadMeta);trackEvent('generate_lead',leadMeta);if(leadMeta.product_slug)trackEvent('request_quote',leadMeta)}else if(!response.ok)trackEvent('form_error',{...leadMeta,error_type:`http_${response.status}`})}return response}catch(error){if(isLead)trackEvent('form_error',{...leadMeta,error_type:'network'});throw error}
    };wrapped.__voltaresAnalytics=true;window.fetch=wrapped;
  }
  captureSource();state.consent=safeStorage.get(localStorage,CONSENT_KEY);if(!['accepted','declined'].includes(state.consent))state.consent=null;
  window.voltaAnalytics=Object.freeze({trackEvent,getAttribution,setConsent,getConsent:()=>state.consent});
  loadGoogleTag();renderConsent();bindInteractions();wrapFetch();if(state.consent==='accepted')loadProviders();
})();
