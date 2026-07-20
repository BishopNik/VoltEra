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
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const ADMIN_USER = String(process.env.ADMIN_USER || 'admin').trim();
const ADMIN_USERS = String(process.env.ADMIN_USERS || ADMIN_USER).split(',').map(user => user.trim()).filter(Boolean);
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const SECRET_KEY = String(process.env.SECRET_KEY || process.env.SESSION_SECRET || (!IS_PRODUCTION ? crypto.randomBytes(32).toString('hex') : ''));
const CONTACT_API_URL = String(process.env.CONTACT_API_URL || '').trim();
const PUBLIC_SITE_URL = /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(String(process.env.PUBLIC_SITE_URL||''))?String(process.env.PUBLIC_SITE_URL).replace(/\/$/,''):'https://voltares.pp.ua';
const GA4_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(String(process.env.GA4_MEASUREMENT_ID||''))?String(process.env.GA4_MEASUREMENT_ID).toUpperCase():'';
const CLARITY_PROJECT_ID = /^[a-z0-9]+$/i.test(String(process.env.CLARITY_PROJECT_ID||''))?String(process.env.CLARITY_PROJECT_ID):'';
const GOOGLE_SITE_VERIFICATION = String(process.env.GOOGLE_SITE_VERIFICATION||'').trim().slice(0,200).replace(/[^a-zA-Z0-9_\-.]/g,'');
const ANALYTICS_DEBUG = /^(1|true|yes)$/i.test(String(process.env.ANALYTICS_DEBUG||''));
const COLLECTIONS = new Set(['leads','reviews','questions','faqs','projects','articles','equipment','solarPanels','greenProtect','users']);
const LEGACY_SAMPLE_IDS = {
  leads: ['1082', '1081'],
  reviews: ['r1', 'r2', 'r3', 'r4'],
  questions: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
  faqs: ['faq1', 'faq2', 'faq3', 'faq4', 'faq5', 'faq6'],
  projects: ['p1', 'p2', 'p3'],
  equipment: ['e1', 'e2', 'e3']
};
const EQUIPMENT_CATALOG_MIGRATION_ID = 'add-deye-catalog-2026-07-18-v1';
const EQUIPMENT_IMAGE_NORMALIZATION_ID = 'normalize-equipment-images-2026-07-18-v1';
const EQUIPMENT_RETAIL_PRICE_MIGRATION_ID = 'set-equipment-retail-prices-2026-07-19-v2';
const EQUIPMENT_COMMERCE_MIGRATION_ID = 'set-equipment-commerce-fields-2026-07-19-v1';
const PV_CATALOG_MIGRATION_ID = 'add-pv-panels-and-green-protect-2026-07-20-v1';
const PV_CATALOG_CLEANUP_ID = 'clean-pv-catalog-2026-07-20-v1';
const GREEN_PROTECT_PURCHASE_MIGRATION_ID = 'set-green-protect-purchase-prices-2026-07-20-v1';
const EQUIPMENT_RETAIL_PRICES = Object.freeze({
  'SE-G5.1 Pro-B':'38 900 грн',
  'SE-F5 Pro-C':'38 500 грн',
  'SUN-6K-SG05LP1-AM2-P':'35 900 грн',
  'SUN-8K-SG01LP1-EU':'55 900 грн',
  'SUN-10K-SG02LP1-EU-AM3':'79 900 грн',
  'SUN-12K-SG02LP1-EU-AM3':'82 900 грн',
  'SUN-12K-SG05LP3-EU':'82 900 грн',
  'SUN-15K-SG05LP3-EU-SM2':'99 900 грн',
  'SUN-20K-SG05LP3-EU-SM2':'122 900 грн',
  'SUN-30K-SG02HP3-EU-BM3':'139 900 грн',
  'SUN-50K-SG01HP3-EU-BM4':'204 900 грн',
  'SUN-80K-SG02HP3-EU-EM6':'289 900 грн',
  'BOS-G PRO':'38 900 грн',
  'BOS-G-PDU-2 BMS':'38 900 грн',
  'Стійка BOS-G PRO на 12 АКБ':'18 900 грн',
  'ANJ-LP04-24V-100A-PX':'15 900 грн',
  'ANJ-6200W-48V-W':'13 900 грн',
  'ANJ-4000W-24V-W':'10 900 грн'
});
// Purchase values are deliberately kept in the authenticated CRM payload only.
const EQUIPMENT_COMMERCE = Object.freeze({
  'SE-G5.1 Pro-B':{priceUsd:880,purchasePrice:800,purchaseCurrency:'USD'},
  'SE-F5 Pro-C':{priceUsd:870,purchasePrice:780,purchaseCurrency:'USD'},
  'SUN-6K-SG05LP1-AM2-P':{priceUsd:815,purchasePrice:770,purchaseCurrency:'USD'},
  'SUN-8K-SG01LP1-EU':{priceUsd:1265,purchasePrice:1100,purchaseCurrency:'USD'},
  'SUN-10K-SG02LP1-EU-AM3':{priceUsd:1810,purchasePrice:1600,purchaseCurrency:'USD'},
  'SUN-12K-SG02LP1-EU-AM3':{priceUsd:1875,purchasePrice:1650,purchaseCurrency:'USD'},
  'SUN-12K-SG05LP3-EU':{priceUsd:1875,purchasePrice:1720,purchaseCurrency:'USD'},
  'SUN-15K-SG05LP3-EU-SM2':{priceUsd:2260,purchasePrice:1960,purchaseCurrency:'USD'},
  'SUN-20K-SG05LP3-EU-SM2':{priceUsd:2780,purchasePrice:2550,purchaseCurrency:'USD'},
  'SUN-30K-SG02HP3-EU-BM3':{priceUsd:3165,purchasePrice:2850,purchaseCurrency:'USD'},
  'SUN-50K-SG01HP3-EU-BM4':{priceUsd:4640,purchasePrice:4150,purchaseCurrency:'USD'},
  'SUN-80K-SG02HP3-EU-EM6':{priceUsd:6560,purchasePrice:5950,purchaseCurrency:'USD'},
  'BOS-G PRO':{priceUsd:880,purchasePrice:770,purchaseCurrency:'USD'},
  'BOS-G-PDU-2 BMS':{priceUsd:880,purchasePrice:780,purchaseCurrency:'USD'},
  'Стійка BOS-G PRO на 12 АКБ':{priceUsd:430,purchasePrice:360,purchaseCurrency:'USD'},
  'ANJ-LP04-24V-100A-PX':{priceUsd:360,purchasePrice:290,purchaseCurrency:'USD'},
  'ANJ-6200W-48V-W':{priceUsd:315,purchasePrice:240,purchaseCurrency:'USD'},
  'ANJ-4000W-24V-W':{priceUsd:250,purchasePrice:190,purchaseCurrency:'USD'}
});
const LEGACY_EQUIPMENT_IMAGE_PATHS = new Map([
  ['ANJ-LP04-24V-100A-PX','/assets/equipment/anenji-anj-lp04-24v-100a-px.webp'],
  ['ANJ-6200W-48V-W','/assets/equipment/anenji-anj-6200w-48v-w.jpg'],
  ['ANJ-4000W-24V-W','/assets/equipment/anenji-anj-4000w-24v-w.jpg']
]);
const REQUESTED_EQUIPMENT = [
  {
    _id:'deye-se-g5-1-pro-b', brand:'DEYE', model:'SE-G5.1 Pro-B', power:'5.12 kWh', phase:'LiFePO₄', voltage:'51.2 V', price:EQUIPMENT_RETAIL_PRICES['SE-G5.1 Pro-B'], status:'active',
    images:['/assets/equipment/deye-se-g5-1-pro-b.jpg'],
    description:'DEYE SE-G5.1 Pro-B — літій-залізо-фосфатний акумулятор 51.2 В, 100 А·год (5.12 кВт·год) для систем резервного та автономного живлення. Оснащений інтелектуальною BMS, має ресурс понад 6000 циклів та підтримує масштабування системи.\n\n## Основні переваги\n\n- LiFePO₄ 51.2 В / 100 А·год\n- Ємність 5.12 кВт·год\n- 6000+ циклів\n- Вбудована BMS\n- Паралельне підключення\n- Висока безпека\n- Для інверторів Deye та інших\n- Для дому й бізнесу'
  },
  {
    _id:'deye-se-f5-pro-c', brand:'DEYE', model:'SE-F5 Pro-C', power:'5.12 kWh', phase:'LiFePO₄', voltage:'51.2 V', price:EQUIPMENT_RETAIL_PRICES['SE-F5 Pro-C'], status:'active',
    images:['/assets/equipment/deye-se-f5-pro-c.webp'],
    description:'DEYE SE-F5 Pro-C — сучасна акумуляторна батарея LiFePO₄ 51.2 В, 100 А·год для систем накопичення енергії. Відзначається високою ефективністю, довговічністю та підтримкою паралельного підключення.\n\n## Основні переваги\n\n- LiFePO₄ 51.2 В / 100 А·год\n- Ємність 5.12 кВт·год\n- 6000+ циклів\n- Інтелектуальна BMS\n- Масштабування системи\n- Швидке заряджання\n- Простий монтаж\n- Для домашніх СЕС'
  },
  {
    _id:'deye-sun-6k-sg05lp1-am2-p', brand:'DEYE', model:'SUN-6K-SG05LP1-AM2-P', power:'6 kW', phase:'1 фаза', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-6K-SG05LP1-AM2-P'], status:'active',
    images:['/assets/equipment/deye-sun-sg05lp1.png'],
    description:'SUN-6K-SG05LP1-AM2-P — гібридний інвертор 6 кВт із підтримкою акумуляторів 48 В, MPPT-контролером та чистою синусоїдою для резервного й автономного живлення.\n\n## Основні переваги\n\n- Потужність 6 кВт\n- MPPT-контролер\n- Чиста синусоїда\n- Робота без АКБ\n- Wi-Fi моніторинг\n- LiFePO₄ Ready\n- Високий ККД\n- Для дому та бізнесу'
  },
  {
    _id:'deye-sun-8k-sg01lp1-eu', brand:'DEYE', model:'SUN-8K-SG01LP1-EU', power:'8 kW', phase:'1 фаза', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-8K-SG01LP1-EU'], status:'active',
    images:['/assets/equipment/deye-sun-sg01lp1.png'],
    description:'Deye SUN-8K-SG01LP1-EU — однофазний гібридний інвертор 8 кВт для сонячних електростанцій із підтримкою акумуляторів 48 В.\n\n## Основні переваги\n\n- Потужність 8 кВт\n- MPPT-контролер\n- Wi-Fi моніторинг\n- Робота без АКБ\n- Чиста синусоїда\n- LiFePO₄ Ready\n- Високий ККД\n- Резервне живлення'
  },
  {
    _id:'deye-sun-10k-sg02lp1-eu-am3', brand:'DEYE', model:'SUN-10K-SG02LP1-EU-AM3', power:'10 kW', phase:'1 фаза', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-10K-SG02LP1-EU-AM3'], status:'active',
    images:['/assets/equipment/deye-sun-sg01lp1.png'],
    description:'Deye SUN-10K-SG02LP1-EU-AM3 — однофазний гібридний інвертор 10 кВт для ефективних систем резервного та автономного електроживлення.\n\n## Основні переваги\n\n- Потужність 10 кВт\n- MPPT-контролер\n- Підтримка 48 В АКБ\n- Wi-Fi моніторинг\n- Робота без АКБ\n- Чиста синусоїда\n- Висока ефективність\n- Для приватних СЕС'
  },
  {
    _id:'deye-sun-12k-sg02lp1-eu-am3', brand:'DEYE', model:'SUN-12K-SG02LP1-EU-AM3', power:'12 kW', phase:'1 фаза', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-12K-SG02LP1-EU-AM3'], status:'active',
    images:['/assets/equipment/deye-sun-sg01lp1.png'],
    description:'Deye SUN-12K-SG02LP1-EU-AM3 — потужний однофазний гібридний інвертор 12 кВт із підтримкою сонячних панелей та акумуляторів LiFePO₄.\n\n## Основні переваги\n\n- Потужність 12 кВт\n- MPPT-контролер\n- Wi-Fi керування\n- Робота без АКБ\n- LiFePO₄ Ready\n- Чиста синусоїда\n- Високий ККД\n- Для великих будинків'
  },
  {
    _id:'deye-sun-12k-sg05lp3-eu', brand:'DEYE', model:'SUN-12K-SG05LP3-EU', power:'12 kW', phase:'3 фази', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-12K-SG05LP3-EU'], status:'active',
    images:['/assets/equipment/deye-sun-sg05lp3.png'],
    description:'Deye SUN-12K-SG05LP3-EU — трифазний гібридний інвертор 12 кВт для сучасних сонячних електростанцій та резервного живлення.\n\n## Основні переваги\n\n- Потужність 12 кВт\n- Трифазний\n- MPPT-контролер\n- Робота без АКБ\n- Wi-Fi моніторинг\n- LiFePO₄ Ready\n- Чиста синусоїда\n- Для дому й бізнесу'
  },
  {
    _id:'deye-sun-15k-sg05lp3-eu-sm2', brand:'DEYE', model:'SUN-15K-SG05LP3-EU-SM2', power:'15 kW', phase:'3 фази', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-15K-SG05LP3-EU-SM2'], status:'active',
    images:['/assets/equipment/deye-sun-sg05lp3-14-20.png'],
    description:'Deye SUN-15K-SG05LP3-EU-SM2 — трифазний гібридний інвертор 15 кВт для комерційних та приватних сонячних електростанцій.\n\n## Основні переваги\n\n- Потужність 15 кВт\n- Трифазний\n- MPPT-контролер\n- Wi-Fi керування\n- Робота без АКБ\n- LiFePO₄ Ready\n- Високий ККД\n- Для бізнесу'
  },
  {
    _id:'deye-sun-20k-sg05lp3-eu-sm2', brand:'DEYE', model:'SUN-20K-SG05LP3-EU-SM2', power:'20 kW', phase:'3 фази', voltage:'48 V', price:EQUIPMENT_RETAIL_PRICES['SUN-20K-SG05LP3-EU-SM2'], status:'active',
    images:['/assets/equipment/deye-sun-sg05lp3-14-20.png'],
    description:'Deye SUN-20K-SG05LP3-EU-SM2 — трифазний гібридний інвертор 20 кВт для потужних систем накопичення та генерації електроенергії.\n\n## Основні переваги\n\n- Потужність 20 кВт\n- Трифазний\n- MPPT-контролер\n- Wi-Fi моніторинг\n- LiFePO₄ Ready\n- Робота без АКБ\n- Чиста синусоїда\n- Для підприємств'
  },
  {
    _id:'deye-sun-30k-sg02hp3-eu-bm3', brand:'DEYE', model:'SUN-30K-SG02HP3-EU-BM3', power:'30 kW', phase:'3 фази', voltage:'HV', price:EQUIPMENT_RETAIL_PRICES['SUN-30K-SG02HP3-EU-BM3'], status:'active',
    images:['/assets/equipment/deye-sun-30k-sg02hp3.png'],
    description:'Deye SUN-30K-SG02HP3-EU-BM3 — високовольтний трифазний гібридний інвертор 30 кВт для комерційних сонячних електростанцій.\n\n## Основні переваги\n\n- Потужність 30 кВт\n- Високовольтні АКБ\n- MPPT-контролер\n- Wi-Fi моніторинг\n- Високий ККД\n- Трифазний\n- Для комерційних СЕС\n- Надійний захист'
  },
  {
    _id:'deye-sun-50k-sg01hp3-eu-bm4', brand:'DEYE', model:'SUN-50K-SG01HP3-EU-BM4', power:'50 kW', phase:'3 фази', voltage:'HV', price:EQUIPMENT_RETAIL_PRICES['SUN-50K-SG01HP3-EU-BM4'], status:'active',
    images:['/assets/equipment/deye-sun-50k-sg01hp3.jpg'],
    description:'Deye SUN-50K-SG01HP3-EU-BM4 — високовольтний гібридний інвертор 50 кВт для великих комерційних та промислових об’єктів.\n\n## Основні переваги\n\n- Потужність 50 кВт\n- Високовольтні АКБ\n- Трифазний\n- MPPT-контролер\n- Високий ККД\n- Wi-Fi/Ethernet\n- Для промисловості\n- Максимальна надійність'
  },
  {
    _id:'deye-sun-80k-sg02hp3-eu-em6', brand:'DEYE', model:'SUN-80K-SG02HP3-EU-EM6', power:'80 kW', phase:'3 фази', voltage:'HV', price:EQUIPMENT_RETAIL_PRICES['SUN-80K-SG02HP3-EU-EM6'], status:'active',
    images:['/assets/equipment/deye-sun-80k-sg02hp3.png'],
    description:'Deye SUN-80K-SG02HP3-EU-EM6 — високопродуктивний трифазний інвертор 80 кВт для промислових систем накопичення енергії.\n\n## Основні переваги\n\n- Потужність 80 кВт\n- Високовольтні АКБ\n- MPPT-контролер\n- Високий ККД\n- Трифазний\n- Розширений моніторинг\n- Для великих СЕС\n- Промислове застосування'
  },
  {
    _id:'deye-bos-g-pro', brand:'DEYE', model:'BOS-G PRO', power:'5.12 kWh', phase:'LiFePO₄ HV', voltage:'51.2 V', price:EQUIPMENT_RETAIL_PRICES['BOS-G PRO'], status:'active',
    images:['/assets/equipment/deye-bos-g-pro.jpg'],
    description:'Deye BOS-G PRO — високовольтний модульний акумулятор LiFePO₄ 51.2 В, 100 А·год для професійних систем накопичення енергії.\n\n## Основні переваги\n\n- LiFePO₄ 51.2 В / 100 А·год\n- Високовольтна система\n- 6000+ циклів\n- Вбудована BMS\n- Модульне розширення\n- Висока безпека\n- Для комерційних СЕС\n- Простий монтаж'
  },
  {
    _id:'deye-bos-g-pdu-2', brand:'DEYE', model:'BOS-G-PDU-2 BMS', power:'100 A', phase:'BMS', voltage:'200–1000 V', price:EQUIPMENT_RETAIL_PRICES['BOS-G-PDU-2 BMS'], status:'active',
    images:['/assets/equipment/deye-bos-g-pdu-2.jpg'],
    description:'BMS Deye BOS-G-PDU-2 — система керування високовольтними акумуляторами з робочою напругою 200–1000 В та струмом 100 А, що забезпечує безпечну та стабільну роботу батарейних систем.\n\n## Основні переваги\n\n- Діапазон 200–1000 В\n- Струм до 100 А\n- Контроль батарей\n- Балансування комірок\n- Захист системи\n- CAN та RS485\n- Проста інтеграція\n- Висока надійність'
  },
  {
    _id:'deye-bos-g-rack-12', brand:'DEYE', model:'Стійка BOS-G PRO на 12 АКБ', power:'До 12 модулів', phase:'BOS-G PRO', voltage:'HV', price:EQUIPMENT_RETAIL_PRICES['Стійка BOS-G PRO на 12 АКБ'], status:'active',
    images:['/assets/equipment/deye-bos-g-rack-clean.jpg'],
    description:'Стійка Deye призначена для встановлення до 12 високовольтних акумуляторних модулів BOS-G PRO. Забезпечує надійне розміщення, вентиляцію та зручне обслуговування системи.\n\n## Основні переваги\n\n- До 12 акумуляторів\n- Міцна конструкція\n- Простий монтаж\n- Зручне обслуговування\n- Ефективне охолодження\n- Компактне розміщення\n- Для систем BOS-G PRO\n- Професійне виконання'
  }
];

const REQUESTED_SOLAR_PANELS = [
  ['tw-solar-440-bf','TW Solar','TWMND-54HB440W BF','440 W','N-type · двостороння',75.4,3990,90],
  ['suntech-440-bf','Suntech','STP440S-C54/Nshb BF','440 W','N-type · двостороння',75.4,3990,90],
  ['sunova-610','Sunova','SS-BG610-66MDH','610 W','Mono · двостороння',99.55,4990,113],
  ['aiko-610','AIKO','A610-MAH72Mw','610 W','ABC N-type',108.7,5290,120],
  ['longi-615-bf','LONGi','Hi-MO X10 615W BF','615 W','N-type · двостороння',106.5,5290,120],
  ['longi-630','LONGi','Hi-MO 7 630W','630 W','N-type',105.8,5290,120],
  ['tw-solar-640-bf','TW Solar','TWMNH-66HD640W BF','640 W','N-type · двостороння',107.4,5390,122],
  ['aiko-645-bf','AIKO','A645-MAH78Db BF','645 W','ABC N-type · двостороння',114.65,6290,142]
].map(([_id,brand,model,power,technology,purchasePrice,price,priceUsd],homeOrder)=>({_id,brand,model,power,technology,phase:technology,voltage:'',purchasePrice,purchaseCurrency:'USD',price:`${price.toLocaleString('uk-UA')} грн`,priceUsd,description:`${brand} ${model} — сонячна панель ${power}. Актуальну наявність, логістику та сумісність зі схемою станції підтвердить інженер.`,images:['/assets/catalog/solar-panel.svg'],status:'active',homeOrder:homeOrder+1}));

const etiProduct=(code,name,category,listPrice,spec='')=>({
  _id:`eti-${code}`,code,brand:'ETI',model:name,name,category,listPrice,
  purchasePrice:Math.round(listPrice*0.65),purchaseCurrency:'UAH',
  price:`${Math.round(listPrice*0.85).toLocaleString('uk-UA')} грн`,priceUsd:0,
  power:spec,phase:category,voltage:'DC',spec,sourceUrl:'https://www.eti.ua/produktsiya-ua/international/photovoltaic-battery-fuses-and-devices-green-protect',
  images:['/assets/catalog/green-protect.svg'],status:'active'
});
const REQUESTED_GREEN_PROTECT = [
  etiProduct('1903230','ETIMAT P10 DC 2p C 16A','Автоматичні вимикачі',676,'2P · C16 · DC'),
  etiProduct('1903231','ETIMAT P10 DC 2p C 20A','Автоматичні вимикачі',691.6,'2P · C20 · DC'),
  etiProduct('1903232','ETIMAT P10 DC 2p C 25A','Автоматичні вимикачі',696.8,'2P · C25 · DC'),
  etiProduct('1903233','ETIMAT P10 DC 2p C 32A','Автоматичні вимикачі',800.8,'2P · C32 · DC'),
  etiProduct('1903234','ETIMAT P10 DC 2p C 40A','Автоматичні вимикачі',889.2,'2P · C40 · DC'),
  etiProduct('1903235','ETIMAT P10 DC 2p C 50A','Автоматичні вимикачі',1097.2,'2P · C50 · DC'),
  etiProduct('1903236','ETIMAT P10 DC 2p C 63A','Автоматичні вимикачі',1138.8,'2P · C63 · DC'),
  etiProduct('2625075','CH 10×38 gPV 10A 1000V','Запобіжники gPV',161.2,'10A · 1000V DC'),
  etiProduct('2625080','CH 10×38 gPV 15A 1000V','Запобіжники gPV',161.2,'15A · 1000V DC'),
  etiProduct('2625081','CH 10×38 gPV 16A 1000V','Запобіжники gPV',161.2,'16A · 1000V DC'),
  etiProduct('2625085','CH 10×38 gPV 20A 1000V','Запобіжники gPV',161.2,'20A · 1000V DC'),
  etiProduct('2625139','CH 10×38 gPV 25A 1000V','Запобіжники gPV',200.2,'25A · 1000V DC'),
  etiProduct('2540201','EFH 10 1P 25A 1000V DC','Тримачі запобіжників',171.6,'1P · 25A · 1000V'),
  etiProduct('2540211','EFH 10 1P LED 25A 1000V DC','Тримачі запобіжників',332.8,'1P LED · 25A · 1000V'),
  etiProduct('2540203','EFH 10 2P 25A 1000V DC','Тримачі запобіжників',343.2,'2P · 25A · 1000V'),
  etiProduct('2540213','EFH 10 2P LED 25A 1000V DC','Тримачі запобіжників',748.8,'2P LED · 25A · 1000V'),
  etiProduct('2440735','ETITEC M T2 PV 600/20 Y','Захист від перенапруги',3796,'T2 · 600V DC · 20kA'),
  etiProduct('2440515','ETITEC M T2 PV 1100/20 Y','Захист від перенапруги',3744,'T2 · 1100V DC · 20kA'),
  etiProduct('2440580','ETITEC EM T12 PV 1100/6.25 Y','Захист від перенапруги',4888,'T1+T2 · 1100V DC'),
  etiProduct('2440517','ETITEC M T2 PV 1500/20 Y','Захист від перенапруги',4784,'T2 · 1500V DC · 20kA'),
  etiProduct('4660060','LS 16 SMA A2 2P 16A DC','DC роз’єднувачі',2028,'2P · 16A DC'),
  etiProduct('4660063','LS 16 SMA A4 4P 16A DC','DC роз’єднувачі',2288,'4P · 16A DC'),
  etiProduct('4660061','LS 25 SMA A2 2P 25A DC','DC роз’єднувачі',2340,'2P · 25A DC'),
  etiProduct('4660064','LS 25 SMA A4 4P 25A DC','DC роз’єднувачі',2964,'4P · 25A DC'),
  etiProduct('4660062','LS 32 SMA A2 2P 32A DC','DC роз’єднувачі',2782,'2P · 32A DC'),
  etiProduct('4660065','LS 32 SMA A4 4P 32A DC','DC роз’єднувачі',3276,'4P · 32A DC'),
  etiProduct('4661854','LBS 160 2P DC1000','Рубильники навантаження',6760,'2P · 160A · 1000V DC'),
  etiProduct('4661855','LBS 250 2P DC1000','Рубильники навантаження',8216,'2P · 250A · 1000V DC')
];

const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json' };
const requestBuckets = new Map();

function normalizedEquipmentImages(item={}){
  const replacement=LEGACY_EQUIPMENT_IMAGE_PATHS.get(String(item.model||''));
  const source=[...(Array.isArray(item.images)?item.images:[]),item.image]
    .filter(value=>typeof value==='string'&&value.trim())
    .map(value=>value.trim());
  const links=[...new Set(source.filter(value=>!value.startsWith('data:image/')))];
  return replacement&&(!links.length||source.some(value=>value.startsWith('data:image/')))?[replacement]:links;
}

if (IS_PRODUCTION && !SECRET_KEY) throw new Error('SECRET_KEY_REQUIRED');
if (IS_PRODUCTION && !process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');

class FileStore {
  constructor(file){ this.file=file; this.data=null; this.queue=Promise.resolve(); }
  async init(){
    this.data=JSON.parse(await fs.readFile(this.file,'utf8'));
    let changed=false;
    for(const name of COLLECTIONS){if(!Array.isArray(this.data[name])){this.data[name]=[];changed=true;}}
    if(!Array.isArray(this.data._migrations)){this.data._migrations=[];changed=true;}
    if(!this.data._migrations.includes(EQUIPMENT_CATALOG_MIGRATION_ID)){
      const now=new Date().toISOString();
      const knownModels=new Set(this.data.equipment.map(item=>String(item.model).toLowerCase()));
      for(const item of REQUESTED_EQUIPMENT){
        if(knownModels.has(String(item.model).toLowerCase()))continue;
        this.data.equipment.push({...item,createdAt:now,updatedAt:now});
      }
      this.data._migrations.push(EQUIPMENT_CATALOG_MIGRATION_ID);
      changed=true;
    }
    if(!this.data._migrations.includes(EQUIPMENT_IMAGE_NORMALIZATION_ID)){
      for(const item of this.data.equipment){
        const images=normalizedEquipmentImages(item);
        if(images.length)item.images=images;
        if('image' in item)delete item.image;
      }
      this.data._migrations.push(EQUIPMENT_IMAGE_NORMALIZATION_ID);
      changed=true;
    }
    if(!this.data._migrations.includes(EQUIPMENT_RETAIL_PRICE_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const item of this.data.equipment){
        const price=EQUIPMENT_RETAIL_PRICES[String(item.model||'').trim()];
        if(!price)continue;
        item.price=price;
        item.updatedAt=now;
      }
      this.data._migrations.push(EQUIPMENT_RETAIL_PRICE_MIGRATION_ID);
      changed=true;
    }
    if(!this.data._migrations.includes(EQUIPMENT_COMMERCE_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const item of this.data.equipment){
        const commerce=EQUIPMENT_COMMERCE[String(item.model||'').trim()];
        if(!commerce)continue;
        Object.assign(item,commerce,{updatedAt:now});
      }
      this.data._migrations.push(EQUIPMENT_COMMERCE_MIGRATION_ID);
      changed=true;
    }
    if(!this.data._migrations.includes(PV_CATALOG_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const [type,records] of [['solarPanels',REQUESTED_SOLAR_PANELS],['greenProtect',REQUESTED_GREEN_PROTECT]]){
        const known=new Set(this.data[type].map(item=>String(item._id)));
        for(const item of records)if(!known.has(String(item._id)))this.data[type].push({...item,createdAt:now,updatedAt:now});
      }
      this.data._migrations.push(PV_CATALOG_MIGRATION_ID);
      changed=true;
    }
    if(!this.data._migrations.includes(PV_CATALOG_CLEANUP_ID)){
      for(const item of this.data.solarPanels)if(item.code==null)delete item.code;
      this.data._migrations.push(PV_CATALOG_CLEANUP_ID); changed=true;
    }
    if(!this.data._migrations.includes(GREEN_PROTECT_PURCHASE_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const item of this.data.greenProtect){
        if(Number(item.listPrice)>0)Object.assign(item,{purchasePrice:Math.round(Number(item.listPrice)*0.65),purchaseCurrency:'UAH',updatedAt:now});
      }
      this.data._migrations.push(GREEN_PROTECT_PURCHASE_MIGRATION_ID); changed=true;
    }
    for(const review of this.data.reviews||[]){ if(review.status==='waiting'){review.status='published';changed=true;} if(review.verified===undefined){ review.verified=false; review.verifiedBy=''; review.verifiedAt=null; review.audit=[]; changed=true; } if(!Array.isArray(review.audit)){ review.audit=[]; changed=true; } }
    if(changed)await this.persist();
  }
  async persist(){ const tmp=`${this.file}.tmp`; await fs.writeFile(tmp,JSON.stringify(this.data,null,2)); await fs.rename(tmp,this.file); }
  async list(type){ return [...(this.data[type]||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
  async create(type,payload){ const now=new Date().toISOString(); const item={...payload,_id:crypto.randomUUID(),createdAt:now,updatedAt:now}; if(['leads','reviews','questions'].includes(type)&&item.viewedAt===undefined)item.viewedAt=null; this.data[type].push(item); await this.persist(); return item; }
  async update(type,id,payload){ const item=this.data[type].find(x=>String(x._id)===id); if(!item)return null; Object.assign(item,payload,{updatedAt:new Date().toISOString()}); if(type==='equipment')delete item.image; delete item._id; item._id=id; await this.persist(); return item; }
  async remove(type,id){ const index=this.data[type].findIndex(x=>String(x._id)===id); if(index<0)return false; this.data[type].splice(index,1); await this.persist(); return true; }
  async markViewed(type){ const now=new Date().toISOString(); (this.data[type]||[]).forEach(item=>{if(!item.viewedAt)item.viewedAt=now;}); await this.persist(); }
  async incrementEquipmentViews(id){ const item=this.data.equipment.find(entry=>String(entry._id)===String(id)); if(!item)return null; item.views=Number(item.views||0)+1; await this.persist(); return item.views; }
}

class MongoStore {
  constructor(client,db,ObjectId){ this.client=client; this.db=db; this.ObjectId=ObjectId; }
  async init(){
    for(const name of COLLECTIONS) await this.db.collection(name).createIndex({createdAt:-1});
    await this.db.collection('users').createIndex({username:1},{unique:true});
    await this.db.collection('media').createIndex({sha256:1},{unique:true});
    // Remove only the old demo documents. MongoDB is no longer populated from
    // data/db.json, so content deleted in CRM stays deleted after a deployment.
    const migrations=this.db.collection('_migrations');
    const cleanupId='remove-legacy-samples-v1';
    if(!await migrations.findOne({_id:cleanupId})){
      for(const [name,ids] of Object.entries(LEGACY_SAMPLE_IDS)) await this.db.collection(name).deleteMany({_id:{$in:ids}});
      await migrations.insertOne({_id:cleanupId,completedAt:new Date().toISOString()});
    }
    if(!await migrations.findOne({_id:EQUIPMENT_CATALOG_MIGRATION_ID})){
      const now=new Date().toISOString();
      for(const source of REQUESTED_EQUIPMENT){
        const {_id,...item}=source;
        await this.db.collection('equipment').updateOne(
          {model:item.model},
          {$setOnInsert:{...item,createdAt:now,updatedAt:now}},
          {upsert:true}
        );
      }
      try{
        await migrations.updateOne(
          {_id:EQUIPMENT_CATALOG_MIGRATION_ID},
          {$setOnInsert:{completedAt:now}},
          {upsert:true}
        );
      }catch(error){
        // Parallel Vercel cold starts can finish the same idempotent migration
        // together. A duplicate marker means the catalogue is already ready.
        if(error?.code!==11000)throw error;
      }
    }
    if(!await migrations.findOne({_id:EQUIPMENT_IMAGE_NORMALIZATION_ID})){
      const equipment=this.db.collection('equipment');
      const items=await equipment.find({},{projection:{model:1,image:1,images:1}}).toArray();
      const now=new Date().toISOString();
      for(const item of items){
        const images=normalizedEquipmentImages(item);
        // Keep an unknown legacy Base64 record intact rather than deleting its
        // only image. Known legacy models are replaced with versioned assets.
        if(!images.length)continue;
        await equipment.updateOne({_id:item._id},{$set:{images,updatedAt:now},$unset:{image:''}});
      }
      try{await migrations.updateOne({_id:EQUIPMENT_IMAGE_NORMALIZATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:EQUIPMENT_RETAIL_PRICE_MIGRATION_ID})){
      const equipment=this.db.collection('equipment');
      const now=new Date().toISOString();
      for(const [model,price] of Object.entries(EQUIPMENT_RETAIL_PRICES)){
        await equipment.updateMany({model},{$set:{price,updatedAt:now}});
      }
      try{await migrations.updateOne({_id:EQUIPMENT_RETAIL_PRICE_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:EQUIPMENT_COMMERCE_MIGRATION_ID})){
      const equipment=this.db.collection('equipment');
      const now=new Date().toISOString();
      for(const [model,commerce] of Object.entries(EQUIPMENT_COMMERCE)){
        await equipment.updateMany({model},{$set:{...commerce,updatedAt:now}});
      }
      try{await migrations.updateOne({_id:EQUIPMENT_COMMERCE_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:PV_CATALOG_MIGRATION_ID})){
      const now=new Date().toISOString();
      for(const [type,records] of [['solarPanels',REQUESTED_SOLAR_PANELS],['greenProtect',REQUESTED_GREEN_PROTECT]]){
        for(const source of records){
          const {_id,...item}=source;
          const identity=item.code?{code:item.code}:{model:item.model};
          await this.db.collection(type).updateOne(identity,{$setOnInsert:{...item,createdAt:now,updatedAt:now}},{upsert:true});
        }
      }
      try{await migrations.updateOne({_id:PV_CATALOG_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:PV_CATALOG_CLEANUP_ID})){
      const now=new Date().toISOString();
      await this.db.collection('solarPanels').updateMany({code:null},{$unset:{code:''}});
      try{await migrations.updateOne({_id:PV_CATALOG_CLEANUP_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:GREEN_PROTECT_PURCHASE_MIGRATION_ID})){
      const now=new Date().toISOString();
      for(const source of REQUESTED_GREEN_PROTECT){
        await this.db.collection('greenProtect').updateMany({code:source.code},{$set:{purchasePrice:source.purchasePrice,purchaseCurrency:'UAH',updatedAt:now}});
      }
      try{await migrations.updateOne({_id:GREEN_PROTECT_PURCHASE_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    await this.db.collection('reviews').updateMany({verified:{$exists:false}},{$set:{verified:false,verifiedBy:'',verifiedAt:null,audit:[]}});
    await this.db.collection('reviews').updateMany({audit:{$exists:false}},{$set:{audit:[]}});
    await this.db.collection('reviews').updateMany({status:'waiting'},{$set:{status:'published',updatedAt:new Date().toISOString()}});
  }
  id(id){ try{return new this.ObjectId(id)}catch{return id} }
  clean(doc){ if(!doc)return doc; return {...doc,_id:String(doc._id)}; }
  async list(type){ return (await this.db.collection(type).find({}).sort({createdAt:-1}).toArray()).map(x=>this.clean(x)); }
  async create(type,payload){ const now=new Date().toISOString(); const item={...payload,createdAt:now,updatedAt:now}; if(['leads','reviews','questions'].includes(type)&&item.viewedAt===undefined)item.viewedAt=null; const result=await this.db.collection(type).insertOne(item); return this.clean({...item,_id:result.insertedId}); }
  async update(type,id,payload){ const update={...payload,updatedAt:new Date().toISOString()}; delete update._id; const operation={$set:update}; if(type==='equipment')operation.$unset={image:''}; const result=await this.db.collection(type).findOneAndUpdate({_id:this.id(id)},operation,{returnDocument:'after'}); return this.clean(result); }
  async remove(type,id){ return (await this.db.collection(type).deleteOne({_id:this.id(id)})).deletedCount>0; }
  async markViewed(type){ await this.db.collection(type).updateMany({viewedAt:null},{$set:{viewedAt:new Date().toISOString()}}); }
  async incrementEquipmentViews(id){ const result=await this.db.collection('equipment').findOneAndUpdate({_id:this.id(id),status:'active'},{$inc:{views:1}},{returnDocument:'after',projection:{views:1}}); return result?Number(result.views||0):null; }
  async saveMedia(data,contentType){
    const sha256=crypto.createHash('sha256').update(data).digest('hex');
    const now=new Date().toISOString();
    await this.db.collection('media').updateOne({sha256},{$setOnInsert:{data,contentType,sha256,createdAt:now}},{upsert:true});
    const media=await this.db.collection('media').findOne({sha256},{projection:{_id:1}});
    return String(media._id);
  }
  async getMedia(id){ return this.db.collection('media').findOne({_id:this.id(id)}); }
}

async function createStore(){
  if(process.env.MONGODB_URI){
    try{ const {MongoClient,ObjectId}=await import('mongodb'); const client=new MongoClient(process.env.MONGODB_URI); await client.connect(); const store=new MongoStore(client,client.db(process.env.MONGODB_DB||'ink_energy'),ObjectId); await store.init(); console.log('Database: MongoDB'); return store; }
    catch(error){
      if(IS_PRODUCTION)throw error;
      console.error('MongoDB connection failed, using local store:',error.message);
    }
  }
  const store=new FileStore(path.join(ROOT,'data','db.json')); await store.init(); console.log('Database: local JSON fallback'); return store;
}
const store = await createStore();

function passwordRecord(password,salt=crypto.randomBytes(16).toString('hex')){
  return {passwordSalt:salt,passwordHash:crypto.scryptSync(String(password),salt,64).toString('hex')};
}
function passwordMatches(password,user={}){
  if(!user.passwordSalt||!user.passwordHash)return false;
  const actual=crypto.scryptSync(String(password),user.passwordSalt,64);
  const expected=Buffer.from(user.passwordHash,'hex');
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function safeUser(user={}){
  const {passwordHash,passwordSalt,...safe}=user;
  return {...safe,role:isPrimaryAdminName(user.username)?'admin':'user'};
}
function isPrimaryAdminName(username=''){return String(username).toLowerCase()===String(ADMIN_USER).toLowerCase()}
function sessionUser(account={}){return {id:String(account._id),name:account.username,role:isPrimaryAdminName(account.username)?'admin':'user'}}
async function ensureBootstrapUsers(){
  const users=await store.list('users');
  if(users.length)return;
  if(!ADMIN_PASSWORD){
    const error=new Error('ADMIN_PASSWORD_REQUIRED_FOR_BOOTSTRAP');
    if(IS_PRODUCTION)throw error;
    console.warn(`${error.message}: create the first local user by setting ADMIN_PASSWORD.`);
    return;
  }
  for(const username of ADMIN_USERS){
    try{await store.create('users',{username,role:isPrimaryAdminName(username)?'admin':'user',status:'active',...passwordRecord(ADMIN_PASSWORD)});}catch(error){if(error?.code!==11000)throw error;}
  }
}
await ensureBootstrapUsers();

function securityHeaders(res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options','DENY');
  if(IS_PRODUCTION)res.setHeader('Strict-Transport-Security','max-age=63072000; includeSubDomains; preload');
  const upgrade=IS_PRODUCTION?'; upgrade-insecure-requests':'';
  res.setHeader('Content-Security-Policy',`default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com https://*.clarity.ms; connect-src 'self' https://api-contact-tg.a-nikanorov.workers.dev https://vitals.vercel-insights.com https://www.google-analytics.com https://region1.google-analytics.com https://*.clarity.ms; frame-src https://www.google.com https://maps.google.com${upgrade}`);
}
function json(res,status,data,headers={}){ securityHeaders(res); res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}); res.end(JSON.stringify(data)); }
function htmlEscape(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function absoluteUrl(value=''){
  const source=String(value||'').trim();
  if(!source)return '';
  return source.startsWith('http://')||source.startsWith('https://')?source:`https://voltares.pp.ua${source.startsWith('/')?'':'/'}${source}`;
}
function priceAmount(value=''){
  const digits=String(value||'').replace(/[^\d]/g,'');
  return digits?String(Number(digits)):'';
}
function equipmentUrl(item={}){return `/products/${encodeURIComponent(String(item._id||'').trim())}`}
function jsonLd(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
const SEO_CATEGORIES=Object.freeze({
  inverters:{name:'Гібридні інвертори',title:'Гібридні інвертори для дому та бізнесу | Voltares',description:'Однофазні й трифазні гібридні інвертори для резервного живлення та сонячних електростанцій. Порівняння потужності, фаз і напруги АКБ.',intro:'Гібридний інвертор керує мережею, акумулятором і сонячними панелями. Вибір залежить від пікового навантаження, кількості фаз, напруги батареї та майбутнього розширення системи.',match:item=>/фаз/i.test(String(item.phase||''))&&/kw/i.test(String(item.power||''))},
  batteries:{name:'LiFePO₄ акумулятори',title:'LiFePO4 акумулятори для інвертора | Voltares',description:'LiFePO4 батареї для резервного й автономного живлення: ємність, напруга, BMS, сумісність і модульне розширення системи.',intro:'LiFePO₄ акумулятор обирають за корисною енергією, напругою, струмом BMS і протоколом зв’язку з інвертором. Для точного розрахунку важливий реальний профіль навантаження.',match:item=>/kwh|lifepo|bms|акб/i.test([item.power,item.phase,item.model].join(' '))},
  solar:{name:'Обладнання для сонячних систем',title:'Обладнання для гібридних сонячних систем | Voltares',description:'Гібридні інвертори та накопичувачі енергії для домашніх і комерційних СЕС. Підбір MPPT, потужності панелей, батареї та резервного контуру.',intro:'Гібридна сонячна система поєднує панелі, інвертор, батарею й захист. До розрахунку входять генерація за орієнтацією даху, MPPT-діапазон, денне споживання та потрібний резерв.',match:item=>/^sun-/i.test(String(item.model||''))}
});
function injectPublicHead(page=''){
  const source=String(page);
  const markup=[];
  if(GOOGLE_SITE_VERIFICATION&&!source.includes('name="google-site-verification"'))markup.push(`<meta name="google-site-verification" content="${htmlEscape(GOOGLE_SITE_VERIFICATION)}">`);
  if(!source.includes('/analytics.js'))markup.push('<script defer src="/analytics-config.js"></script><script defer src="/analytics.js?v=20260720-1"></script>');
  return markup.length?source.replace('</head>',`${markup.join('')}</head>`):source;
}
function enhanceStaticArticle(page='',pathname=''){
  const source=String(page);if(!pathname.startsWith('/articles/'))return source;
  const title=(source.match(/<title>([^<]+)/i)?.[1]||'Стаття Voltares').replace(/\s*\|.*$/,'').trim();
  const description=source.match(/<meta\s+name="description"\s+content="([^"]+)/i)?.[1]||title;
  const canonical=source.match(/<link\s+rel="canonical"\s+href="([^"]+)/i)?.[1]||`${PUBLIC_SITE_URL}${pathname}`;
  const image=`${PUBLIC_SITE_URL}/og-voltera.svg`;
  const articleSchema={'@context':'https://schema.org','@type':'Article',headline:title,description,url:canonical,inLanguage:'uk-UA',author:{'@id':`${PUBLIC_SITE_URL}/#organization`},publisher:{'@id':`${PUBLIC_SITE_URL}/#organization`}};
  const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Головна',item:`${PUBLIC_SITE_URL}/`},{'@type':'ListItem',position:2,name:'Статті',item:`${PUBLIC_SITE_URL}/#journal`},{'@type':'ListItem',position:3,name:title,item:canonical}]};
  const extra=`${source.includes('property="og:title"')?'':`<meta property="og:type" content="article"><meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="Voltares"><meta property="og:title" content="${htmlEscape(title)}"><meta property="og:description" content="${htmlEscape(description)}"><meta property="og:url" content="${htmlEscape(canonical)}"><meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image">`}${source.includes('"@type":"Article"')?'':`<script type="application/ld+json">${jsonLd(articleSchema)}</script>`}${source.includes('"@type":"BreadcrumbList"')?'':`<script type="application/ld+json">${jsonLd(breadcrumb)}</script>`}`;
  return source.replace('</head>',`${extra}</head>`);
}
function parseCookies(req){ return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(part=>{const i=part.indexOf('=');return [part.slice(0,i).trim(),decodeURIComponent(part.slice(i+1))]})); }
function signToken(token){ return crypto.createHmac('sha256',SECRET_KEY).update(token).digest('base64url'); }
function packSessionCookie(session){ const payload=Buffer.from(JSON.stringify(session)).toString('base64url'); return `${payload}.${signToken(payload)}`; }
function unpackSessionCookie(value=''){ const dot=value.lastIndexOf('.'); if(dot<1)return null; const payload=value.slice(0,dot); const signature=value.slice(dot+1); const expected=signToken(payload); if(signature.length!==expected.length)return null; if(!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null; try{const session=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')); return session.expires>Date.now()?session:null;}catch{return null;} }
function sessionCookie(value,maxAge=28800){ const secure=IS_PRODUCTION?'; Secure':''; return `ink_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`; }
function currentUser(req){ return unpackSessionCookie(parseCookies(req).ink_session)?.user || null; }
async function activeSessionUser(req){
  const user=currentUser(req); if(!user)return null;
  const account=(await store.list('users')).find(item=>String(item._id)===String(user.id||'')||String(item.username)===String(user.name));
  return account?.status==='active'?sessionUser(account):null;
}
async function requireAdmin(req,res){ const user=await activeSessionUser(req); if(!user){json(res,401,{error:'AUTH_REQUIRED'});return null} return user; }
async function body(req,limit=2_500_000){
  let size=0,data='';
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('PAYLOAD_TOO_LARGE');data+=chunk}
  if(!data)return {};
  const contentType=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
  if(contentType==='application/x-www-form-urlencoded')return Object.fromEntries(new URLSearchParams(data));
  if(contentType==='application/json'||!contentType)return JSON.parse(data);
  throw new Error('UNSUPPORTED_CONTENT_TYPE');
}
function compareSafe(a='',b=''){ const left=Buffer.from(String(a)); const right=Buffer.from(String(b)); if(left.length!==right.length)return false; return crypto.timingSafeEqual(left,right); }
function sanitize(type,input){ const allowed={leads:['name','phone','email','city','object','need','comment','status','manager','checkedBy','viewedAt','attribution'],reviews:['name','city','rating','text','reply','status','verified','viewedAt'],questions:['author','city','title','status','likes','answers','viewedAt'],faqs:['question','answer','status','order'],projects:['title','city','type','description','image','images','status'],articles:['title','slug','excerpt','body','category','status','image','images'],equipment:['brand','model','power','phase','voltage','price','priceUsd','purchasePrice','purchaseCurrency','description','status','images','homeMode','homeOrder'],solarPanels:['brand','model','power','technology','phase','voltage','price','priceUsd','purchasePrice','purchaseCurrency','description','status','images','homeOrder'],greenProtect:['code','brand','model','name','category','spec','power','phase','voltage','listPrice','purchasePrice','purchaseCurrency','price','priceUsd','description','sourceUrl','status','images']}[type]||[]; return Object.fromEntries(allowed.filter(k=>input[k]!==undefined).map(k=>[k,input[k]])); }
function sanitizeAttribution(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  const allowed=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','landing_page','referrer'];
  const cleanOne=source=>Object.fromEntries(allowed.map(key=>[key,String(source?.[key]||'').trim().slice(0,key==='referrer'||key==='landing_page'?500:160)]).filter(([,item])=>item));
  const first=cleanOne(value.first_source||value);
  const last=cleanOne(value.last_source||value);
  const clean={...(Object.keys(first).length?{first_source:first}:{}),...(Object.keys(last).length?{last_source:last}:{})};
  return Object.keys(clean).length?clean:undefined;
}
function publicReview(item){ const {audit,viewedAt,verifiedBy,verifiedAt,...safe}=item; return safe; }
function publicEquipmentSummary(item={}){
  const {image,images,description,descriptionEn,translations,audit,viewedAt,purchasePrice,purchaseCurrency,...summary}=item;
  const normalized=normalizedEquipmentImages(item);
  return {...summary,imageCount:normalized.length,thumbnail:normalized[0]||''};
}
function publicEquipmentDetail(item={}){
  const {image,audit,viewedAt,purchasePrice,purchaseCurrency,...detail}=item;
  return {...detail,images:normalizedEquipmentImages(item)};
}
function publicCatalogSummary(item={}){
  const {image,audit,viewedAt,purchasePrice,purchaseCurrency,listPrice,...summary}=item;
  const normalized=[...(Array.isArray(item.images)?item.images:[]),image].filter(Boolean);
  return {...summary,images:normalized,imageCount:normalized.length,thumbnail:normalized[0]||''};
}
function publicCatalogDetail(item={}){
  const {audit,viewedAt,purchasePrice,purchaseCurrency,listPrice,...detail}=item;
  return detail;
}
function clientAddress(req){return String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim().slice(0,80)}
function allowRequest(req,res,scope,limit,windowMs){
  const now=Date.now();
  const key=`${scope}:${clientAddress(req)}`;
  const recent=(requestBuckets.get(key)||[]).filter(timestamp=>now-timestamp<windowMs);
  if(recent.length>=limit){
    const retryAfter=Math.max(1,Math.ceil((windowMs-(now-recent[0]))/1000));
    json(res,429,{error:'RATE_LIMITED'},{'Retry-After':String(retryAfter)});
    return false;
  }
  recent.push(now);
  requestBuckets.set(key,recent);
  if(requestBuckets.size>2000)for(const [bucket,timestamps] of requestBuckets)if(!timestamps.some(timestamp=>now-timestamp<windowMs))requestBuckets.delete(bucket);
  return true;
}
function isSpam(input={}){return Boolean(String(input.website||input.companyWebsite||'').trim())}
function validOrigin(req){
  const origin=String(req.headers.origin||'').trim();
  if(!origin)return true;
  try{return new URL(origin).host===String(req.headers.host||'').trim()}catch{return false}
}
function validPublicInput(type,input={}){
  const name=String(input.name||input.author||'').trim();
  if(type==='leads')return name.length>=2&&name.length<=100&&String(input.phone||'').replace(/\D/g,'').length>=9&&String(input.comment||'').length<=3000;
  if(type==='reviews')return name.length>=2&&name.length<=100&&String(input.text||'').trim().length>=10&&String(input.text||'').length<=3000;
  if(type==='questions')return String(input.title||'').trim().length>=5&&String(input.title||'').length<=500;
  return true;
}
function reviewAudit(previous={},next={},user){ const fields=['status','reply','verified']; const changes=fields.filter(field=>String(previous[field]??'')!==String(next[field]??'')); if(!changes.length)return previous.audit || []; const now=new Date().toISOString(); const entries=changes.map(field=>({at:now,user:user.name,role:user.role,action:field==='verified'?'verify-review':'update-review',field,from:previous[field]??null,to:next[field]??null})); return [...(Array.isArray(previous.audit)?previous.audit:[]),...entries]; }

function notificationText(type,item){
  const lines={
    leads:['Нова заявка',item.name,item.phone,item.need||item.object,item.city,item.comment],
    reviews:['Новий відгук',item.name,item.city,item.text],
    questions:['Нове питання',item.author,item.city,item.title,item.body]
  }[type]||['Новий запис',type];
  return lines.filter(Boolean).map(value=>String(value).trim()).filter(Boolean).join('\n');
}
function contactApiPayload(type,item,message){
  const label={leads:'Нова заявка',reviews:'Новий відгук',questions:'Нове питання'}[type]||'Нове повідомлення';
  const name=String(item.name||item.author||'Відвідувач сайту').trim().slice(0,100);
  const phone=String(item.phone||'').trim().slice(0,50);
  const email=String(item.email||'').trim().slice(0,160);
  const contact=String(phone||email||item.city||label).trim().slice(0,160);
  return {name,contact,service:label,email,phone,message:String(message||label).slice(0,2000),language:'uk'};
}
async function sendContactNotification(type,item){
  if(!['leads','reviews','questions'].includes(type))return;
  if(!CONTACT_API_URL)return;
  const message=notificationText(type,item);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),5000);
  try{
    const payload=contactApiPayload(type,item,message);
    const response=await fetch(CONTACT_API_URL,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok){ const detail=(await response.text()).slice(0,300); console.error(`Notification delivery failed: ${response.status}${detail?` ${detail}`:''}`); }
  }catch(error){console.error('Notification delivery failed:',error.message)}finally{clearTimeout(timeout)}
}

async function getContactApiStatus(){
  if(!CONTACT_API_URL)return {configured:false,available:false,route:''};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),3000);
  try{
    const endpoint=new URL(CONTACT_API_URL);
    const response=await fetch(new URL('/api/instructions',endpoint),{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)return {configured:true,available:false,route:endpoint.pathname};
    const info=await response.json();
    const available=Array.isArray(info.projects)&&info.projects.some(project=>project.project==='voltares'||project.endpoint===CONTACT_API_URL);
    return {configured:true,available,route:endpoint.pathname};
  }catch{return {configured:true,available:false,route:''}}
  finally{clearTimeout(timeout)}
}

async function api(req,res,url){
  if(['POST','PATCH','DELETE'].includes(req.method||'')&&!validOrigin(req))return json(res,403,{error:'ORIGIN_REJECTED'});
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    if(!allowRequest(req,res,'auth-login',5,15*60_000))return;
    const input=await body(req);
    const account=(await store.list('users')).find(user=>compareSafe(String(input.user||''),String(user.username||'')));
    if(!account||account.status!=='active'||!passwordMatches(input.password||'',account)){
      console.warn('Authentication failed',{ip:clientAddress(req),username:String(input.user||'').slice(0,80),at:new Date().toISOString()});
      return json(res,401,{error:'INVALID_CREDENTIALS'});
    }
    const user=sessionUser(account);
    return json(res,200,{user},{'Set-Cookie':sessionCookie(packSessionCookie({user,expires:Date.now()+28_800_000}))});
  }
  if(url.pathname==='/api/auth/me'){const user=await activeSessionUser(req);return user?json(res,200,{user}):json(res,401,{error:'AUTH_REQUIRED'});}
  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){ return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',0)}); }
  if(url.pathname==='/api/integrations/status'){ if(!await requireAdmin(req,res))return; const contact=await getContactApiStatus(); return json(res,200,{contactApi:contact.available,contactApiConfigured:contact.configured,notifications:contact.available,route:contact.route}); }
  if(url.pathname==='/api/dashboard'){ if(!await requireAdmin(req,res))return; const result={}; for(const type of COLLECTIONS){const items=await store.list(type);const hasUnread=['leads','reviews','questions'].includes(type);result[type]={total:items.length,unread:hasUnread?items.filter(x=>!x.viewedAt).length:0};} return json(res,200,result); }
  if(url.pathname==='/api/admin/mark-viewed'&&req.method==='POST'){ if(!await requireAdmin(req,res))return; const input=await body(req); if(!COLLECTIONS.has(input.type))return json(res,400,{error:'INVALID_TYPE'}); await store.markViewed(input.type); return json(res,200,{ok:true}); }
  const mediaMatch=url.pathname.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/);
  if(mediaMatch&&req.method==='GET'){
    if(typeof store.getMedia!=='function')return json(res,404,{error:'NOT_FOUND'});
    const media=await store.getMedia(mediaMatch[1]);
    if(!media)return json(res,404,{error:'NOT_FOUND'});
    const binary=media.data;
    const bytes=Buffer.isBuffer(binary)
      ?binary
      :binary?.buffer
        ?Buffer.from(binary.buffer).subarray(0,Number(binary.position)||binary.buffer.length)
        :Buffer.from(binary||[]);
    securityHeaders(res);
    res.writeHead(200,{'Content-Type':media.contentType||'application/octet-stream','Content-Length':String(bytes.length),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});
    return res.end(bytes);
  }
  if(url.pathname==='/api/uploads'&&req.method==='POST'){
    if(!await requireAdmin(req,res))return;
    const input=await body(req,6_000_000);
    const match=String(input.dataUrl||'').match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if(!match)return json(res,400,{error:'INVALID_IMAGE'});
    const contentType=`image/${match[1]}`;
    const bytes=Buffer.from(match[2],'base64');
    if(!bytes.length||bytes.length>4_500_000)return json(res,400,{error:'INVALID_IMAGE_SIZE'});
    if(process.env.VERCEL){
      if(typeof store.saveMedia!=='function')return json(res,503,{error:'MEDIA_STORE_UNAVAILABLE'});
      const id=await store.saveMedia(bytes,contentType);
      return json(res,201,{url:`/api/media/${id}`});
    }
    const ext=match[1].replace('jpeg','jpg');
    const filename=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    await fs.mkdir(path.join(ROOT,'uploads'),{recursive:true});
    await fs.writeFile(path.join(ROOT,'uploads',filename),bytes);
    return json(res,201,{url:`/uploads/${filename}`});
  }
  const userMatch=url.pathname.match(/^\/api\/users(?:\/([^/]+))?$/);
  if(userMatch){
    const admin=await requireAdmin(req,res); if(!admin)return;
    const id=userMatch[1];
    const canManageUsers=admin.role==='admin';
    if(req.method==='GET'){
      const users=await store.list('users');
      return json(res,200,users.map(safeUser));
    }
    if(req.method==='POST'){
      if(!canManageUsers)return json(res,403,{error:'ADMIN_ONLY'});
      const input=await body(req); const username=String(input.username||'').trim(); const password=String(input.password||'');
      if(username.length<2||password.length<8)return json(res,400,{error:'USER_FIELDS_REQUIRED'});
      if((await store.list('users')).some(user=>String(user.username).toLowerCase()===username.toLowerCase()))return json(res,409,{error:'USER_EXISTS'});
      return json(res,201,safeUser(await store.create('users',{username,role:'user',status:input.status==='disabled'?'disabled':'active',...passwordRecord(password)})));
    }
    if(!id)return json(res,400,{error:'ID_REQUIRED'});
    const users=await store.list('users'); const previous=users.find(user=>String(user._id)===id);
    if(!previous)return json(res,404,{error:'NOT_FOUND'});
    const isSelf=String(admin.id||'')===id||String(previous.username)===String(admin.name);
    if(req.method==='PATCH'){
      const input=await body(req); const update={};
      if(!canManageUsers&&!isSelf)return json(res,403,{error:'OWN_PASSWORD_ONLY'});
      if(!canManageUsers&&(input.username!==undefined||input.status!==undefined))return json(res,403,{error:'OWN_PASSWORD_ONLY'});
      if(input.username!==undefined){ const username=String(input.username).trim(); if(isPrimaryAdminName(previous.username)&&!isPrimaryAdminName(username))return json(res,400,{error:'PRIMARY_USERNAME_LOCKED'}); if(username.length<2)return json(res,400,{error:'INVALID_USERNAME'}); if(users.some(user=>String(user._id)!==id&&String(user.username).toLowerCase()===username.toLowerCase()))return json(res,409,{error:'USER_EXISTS'}); update.username=username; }
      if(input.status!==undefined){
        update.status=input.status==='disabled'?'disabled':'active';
        if(update.status==='disabled'&&isSelf)return json(res,400,{error:'CANNOT_DISABLE_SELF'});
        if(update.status==='disabled'&&previous.status==='active'&&users.filter(user=>user.status==='active').length<=1)return json(res,400,{error:'LAST_ADMIN'});
      }
      if(input.password){ if(String(input.password).length<8)return json(res,400,{error:'PASSWORD_TOO_SHORT'}); Object.assign(update,passwordRecord(input.password)); }
      if(!canManageUsers&&!input.password)return json(res,400,{error:'PASSWORD_REQUIRED'});
      return json(res,200,safeUser(await store.update('users',id,update)));
    }
    if(req.method==='DELETE'){
      if(!canManageUsers)return json(res,403,{error:'ADMIN_ONLY'});
      if(isSelf)return json(res,400,{error:'CANNOT_DELETE_SELF'});
      if(previous.status==='active'&&users.filter(user=>user.status==='active').length<=1)return json(res,400,{error:'LAST_ADMIN'});
      return json(res,(await store.remove('users',id))?200:404,{ok:true});
    }
    return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  }
  const answerMatch=url.pathname.match(/^\/api\/questions\/([^/]+)\/answers$/);
  if(answerMatch&&req.method==='POST'){
    const input=await body(req); const author=String(input.author||'').trim().slice(0,80); const text=String(input.text||'').trim().slice(0,2000);
    if(isSpam(input))return json(res,400,{error:'SPAM_REJECTED'});
    if(!allowRequest(req,res,'public-answer',10,10*60_000))return;
    if(!author||text.length<2)return json(res,400,{error:'REQUIRED_FIELDS'});
    const question=(await store.list('questions')).find(item=>String(item._id)===answerMatch[1]);
    if(!question)return json(res,404,{error:'NOT_FOUND'});
    const answers=[...(Array.isArray(question.answers)?question.answers:[]),{author,role:'community',text,createdAt:new Date().toISOString()}];
    const updated=await store.update('questions',answerMatch[1],{answers,status:answers.some(answer=>answer.role==='engineer')?'answered':'discussion'});
    return json(res,201,updated);
  }
  const equipmentViewMatch=url.pathname.match(/^\/api\/equipment\/([^/]+)\/view$/);
  if(equipmentViewMatch&&req.method==='POST'){
    if(!allowRequest(req,res,`equipment-view-${equipmentViewMatch[1]}`,6,24*60*60_000))return;
    const views=await store.incrementEquipmentViews(equipmentViewMatch[1]);
    return views===null?json(res,404,{error:'NOT_FOUND'}):json(res,200,{views});
  }
  const match=url.pathname.match(/^\/api\/(leads|reviews|questions|faqs|projects|articles|equipment|solarPanels|greenProtect)(?:\/([^/]+))?$/); if(!match)return false;
  const [,type,id]=match; const adminUser=await activeSessionUser(req); const isAdmin=Boolean(adminUser);
  if(req.method==='GET'){
    if(type==='leads'&&!isAdmin)return json(res,401,{error:'AUTH_REQUIRED'});
    let items=await store.list(type);
    if(!isAdmin){
      if(type==='reviews')items=items.filter(x=>x.status==='published').map(publicReview);
      if(['projects','articles'].includes(type))items=items.filter(x=>x.status==='published'||x.status==='active');
      if(type==='equipment'){
        items=items.filter(x=>x.status==='active');
        items=id?items.map(publicEquipmentDetail):items.map(publicEquipmentSummary);
      }
      if(['solarPanels','greenProtect'].includes(type)){
        items=items.filter(x=>x.status==='active');
        items=id?items.map(publicCatalogDetail):items.map(publicCatalogSummary);
      }
      if(type==='faqs')items=items.filter(x=>x.status==='active').sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    }
    if(!isAdmin&&id&&!items.some(x=>String(x._id)===id))return json(res,404,{error:'NOT_FOUND'});
    return json(res,200,id?(items.find(x=>String(x._id)===id)||null):items,isAdmin?{}:{'Cache-Control':'public, max-age=30, stale-while-revalidate=300'});
  }
  if(req.method==='POST'){
    if(!['leads','reviews','questions'].includes(type)&&!await requireAdmin(req,res))return;
    const rawInput=await body(req);
    if(!isAdmin&&['leads','reviews','questions'].includes(type)){
      if(isSpam(rawInput))return json(res,400,{error:'SPAM_REJECTED'});
      if(!allowRequest(req,res,`public-${type}`,type==='leads'?6:8,10*60_000))return;
      if(!validPublicInput(type,rawInput))return json(res,400,{error:'INVALID_FIELDS'});
    }
    const input=sanitize(type,rawInput);
    if(type==='leads')input.attribution=sanitizeAttribution(input.attribution);
    if(type==='equipment'){
      input.homeMode=['auto','featured','hidden'].includes(input.homeMode)?input.homeMode:'auto';
      input.homeOrder=Math.max(0,Number(input.homeOrder||0));
      input.views=0;
    }
    if(type==='leads')Object.assign(input,{status:input.status||'new',manager:input.manager||'',checkedBy:input.checkedBy||'',viewedAt:null});
    if(type==='reviews')Object.assign(input,{status:'published',reply:'',verified:false,verifiedAt:null,verifiedBy:'',audit:[],viewedAt:null,rating:Number(input.rating||5)});
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
  if(['PATCH','DELETE'].includes(req.method)){ const user=await requireAdmin(req,res); if(!user)return; if(!id)return json(res,400,{error:'ID_REQUIRED'}); if(req.method==='DELETE')return json(res,(await store.remove(type,id))?200:404,{ok:true}); const previous=(await store.list(type)).find(item=>String(item._id)===id); if(!previous)return json(res,404,{error:'NOT_FOUND'}); const input=sanitize(type,await body(req)); if(type==='equipment'){ if(input.homeMode!==undefined)input.homeMode=['auto','featured','hidden'].includes(input.homeMode)?input.homeMode:'auto'; if(input.homeOrder!==undefined)input.homeOrder=Math.max(0,Number(input.homeOrder||0)); } if(type==='reviews'){ if(input.verified!==undefined){ input.verified=Boolean(input.verified); input.verifiedAt=input.verified?new Date().toISOString():null; input.verifiedBy=input.verified?user.name:''; } const next={...previous,...input}; input.audit=reviewAudit(previous,next,user); } return json(res,200,await store.update(type,id,input)); }
  return json(res,405,{error:'METHOD_NOT_ALLOWED'});
}

async function serve(req,res,url){
  if(url.pathname==='/admin.html'&&!currentUser(req)){res.writeHead(302,{Location:'/admin-login.html'});return res.end();}
  if(url.pathname==='/analytics-config.js'){
    const config={ga4MeasurementId:GA4_MEASUREMENT_ID,clarityProjectId:CLARITY_PROJECT_ID,debug:ANALYTICS_DEBUG,siteUrl:PUBLIC_SITE_URL};
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
    return res.end(`window.VOLTA_ANALYTICS_CONFIG=Object.freeze(${JSON.stringify(config).replace(/</g,'\\u003c')});`);
  }
  if(url.pathname==='/catalog'||url.pathname==='/catalog/'){
    res.writeHead(301,{Location:'/catalog.html'});return res.end();
  }
  if(url.pathname==='/'&&url.searchParams.get('catalog')==='all'){
    res.writeHead(302,{Location:'/catalog.html'});
    return res.end();
  }
  if(url.pathname==='/sitemap.xml'){
    const fixed=['/','/catalog.html','/faq.html','/calculators.html','/categories/inverters','/categories/batteries','/categories/solar','/rishennia/invertor-dlia-domu.html','/rishennia/rezervne-zhyvlennia-dlia-biznesu.html','/rishennia/soniachni-paneli.html','/obladnannia/deye.html','/obladnannia/anenji.html','/obladnannia/easun.html','/obladnannia/lifepo4.html','/articles/5-pryladiv-iaki-zidaiut-avtonomnist.html','/gallery.html','/community.html'];
    const dynamic=(await store.list('articles')).filter(item=>item.status==='published'&&item.slug).map(item=>({path:`/articles/${encodeURIComponent(item.slug)}.html`,updated:item.updatedAt||item.createdAt}));
    const products=(await Promise.all(['equipment','solarPanels','greenProtect'].map(type=>store.list(type)))).flat().filter(item=>item.status==='active'&&item._id).map(item=>({path:equipmentUrl(item),updated:item.updatedAt||item.createdAt}));
    const fixedEntries=await Promise.all(fixed.map(async pathname=>{if(pathname.startsWith('/categories/'))return{path:pathname};const file=path.join(ROOT,pathname==='/'?'index.html':pathname.slice(1));try{return{path:pathname,updated:(await fs.stat(file)).mtime.toISOString()}}catch{return{path:pathname}}}));
    const entries=[...fixedEntries,...dynamic,...products].filter((item,index,array)=>array.findIndex(other=>other.path===item.path)===index);
    const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(item=>`\n  <url><loc>${PUBLIC_SITE_URL}${htmlEscape(item.path)}</loc>${item.updated?`<lastmod>${htmlEscape(String(item.updated).slice(0,10))}</lastmod>`:''}</url>`).join('')}\n</urlset>`;
    res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'});return res.end(xml);
  }
  const categoryMatch=url.pathname.match(/^\/categories\/([a-z-]+)\/?$/);
  if(categoryMatch){
    if(url.pathname.endsWith('/')){res.writeHead(301,{Location:url.pathname.slice(0,-1)});return res.end()}
    const category=SEO_CATEGORIES[categoryMatch[1]];
    if(!category)return json(res,404,{error:'NOT_FOUND'});
    const items=(await store.list('equipment')).filter(item=>item.status==='active'&&category.match(item));
    const canonical=`${PUBLIC_SITE_URL}/categories/${categoryMatch[1]}`;
    const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Головна',item:`${PUBLIC_SITE_URL}/`},{'@type':'ListItem',position:2,name:'Каталог',item:`${PUBLIC_SITE_URL}/catalog.html`},{'@type':'ListItem',position:3,name:category.name,item:canonical}]};
    const collection={'@context':'https://schema.org','@type':'CollectionPage',name:category.name,description:category.description,url:canonical,inLanguage:'uk-UA',mainEntity:{'@type':'ItemList',numberOfItems:items.length,itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,url:`${PUBLIC_SITE_URL}${equipmentUrl(item)}`,name:`${item.brand||''} ${item.model||''}`.trim()}))}};
    const cards=items.map(item=>{const image=absoluteUrl(normalizedEquipmentImages(item)[0]||'/og-voltera.svg');return`<a class="category-card" href="${equipmentUrl(item)}"><span><img src="${htmlEscape(image)}" alt="${htmlEscape(`${item.brand||''} ${item.model||''}`.trim())}" loading="lazy" width="480" height="480"></span><small>${htmlEscape(item.brand||'Voltares')}</small><h2>${htmlEscape(item.model||'')}</h2><p>${htmlEscape([item.power,item.phase,item.voltage].filter(Boolean).join(' · '))}</p><strong>${htmlEscape(item.price||'Ціна за запитом')}</strong></a>`}).join('');
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(category.title)}</title><meta name="description" content="${htmlEscape(category.description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="uk-UA" href="${canonical}"><link rel="alternate" hreflang="x-default" href="${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="Voltares"><meta property="og:title" content="${htmlEscape(category.title)}"><meta property="og:description" content="${htmlEscape(category.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${PUBLIC_SITE_URL}/og-voltera.svg"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/content-pages.css?v=20260719-2"><link rel="stylesheet" href="/category-page.css?v=20260719-1"><script type="application/ld+json">${jsonLd(collection)}</script><script type="application/ld+json">${jsonLd(breadcrumb)}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="Voltares — головна"></a><nav class="page-nav"><a href="/catalog.html">Каталог</a><a href="/faq.html">FAQ</a><a href="/calculators.html">Калькулятори</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><nav class="breadcrumbs page-container" aria-label="Хлібні крихти"><a href="/">Головна</a><span>›</span><a href="/catalog.html">Каталог</a><span>›</span><span aria-current="page">${htmlEscape(category.name)}</span></nav><section class="category-hero page-container"><p class="page-eyebrow">Категорія обладнання</p><h1>${htmlEscape(category.name)}</h1><p class="page-lead">${htmlEscape(category.intro)}</p></section><section class="category-products page-container" aria-label="Товари категорії">${cards||'<p>Перевірені моделі готуються до публікації.</p>'}</section><section class="category-guide page-container"><h2>Як підготуватися до вибору</h2><p>Запишіть постійне й пікове навантаження, бажаний час автономності, кількість фаз і дані ввідного щита. Інженер перевірить сумісність компонентів та захист.</p><div><a href="/calculators.html">Розрахувати автономність</a><a href="/faq.html">Відповіді на питання</a><a href="/rishennia/invertor-dlia-domu.html">Рішення для дому</a><a href="/rishennia/soniachni-paneli.html">Гібридна СЕС</a></div></section></main><footer class="page-footer"><div class="page-container">© 2026 Voltares / ІНК</div></footer></body></html>`;
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300, stale-while-revalidate=86400'});return res.end(injectPublicHead(page));
  }
  const productMatch=url.pathname.match(/^\/products\/([a-zA-Z0-9_-]+)\/?$/);
  if(productMatch){
    if(url.pathname.endsWith('/')){res.writeHead(301,{Location:url.pathname.slice(0,-1)});return res.end()}
    const equipment=(await Promise.all(['equipment','solarPanels','greenProtect'].map(type=>store.list(type)))).flat().filter(product=>product.status==='active');
    const item=equipment.find(product=>String(product._id)===productMatch[1]);
    if(!item)return json(res,404,{error:'NOT_FOUND'});
    const name=`${item.brand||''} ${item.model||''}`.trim();
    const canonical=`${PUBLIC_SITE_URL}${equipmentUrl(item)}`;
    const images=normalizedEquipmentImages(item).map(absoluteUrl);
    const image=images[0]||'https://voltares.pp.ua/og-voltera.svg';
    const description=String(item.description||`${name} для систем резервного та автономного живлення.`).split(/\n/)[0].slice(0,240);
    const amount=priceAmount(item.price);
    const specs=[['Потужність / ємність',item.power],['Фази / тип',item.phase],['Робоча напруга',item.voltage],['Бренд',item.brand]].filter(([,value])=>value);
    const productSchema={'@context':'https://schema.org','@type':'Product','@id':`${canonical}#product`,name,description,image,sku:String(item._id),brand:{'@type':'Brand',name:item.brand||'Voltares'},url:canonical,...(amount?{offers:{'@type':'Offer',url:canonical,priceCurrency:'UAH',price:amount,itemCondition:'https://schema.org/NewCondition',seller:{'@id':'https://voltares.pp.ua/#organization'}}}:{})};
    const breadcrumbSchema={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Головна',item:'https://voltares.pp.ua/'},{'@type':'ListItem',position:2,name:'Каталог',item:'https://voltares.pp.ua/catalog.html'},{'@type':'ListItem',position:3,name:item.brand||'Обладнання',item:`https://voltares.pp.ua/obladnannia/${String(item.brand||'').toLowerCase()}.html`},{'@type':'ListItem',position:4,name,item:canonical}]};
    const body=String(item.description||'').split(/\n{2,}/).filter(Boolean).map(block=>/^#{2,3}\s/.test(block)?`<h2>${htmlEscape(block.replace(/^#{2,3}\s+/,''))}</h2>`:/^(?:[-•]\s.+\n?)+$/m.test(block)?`<ul>${block.split(/\n/).filter(Boolean).map(line=>`<li>${htmlEscape(line.replace(/^[-•]\s+/,''))}</li>`).join('')}</ul>`:`<p>${htmlEscape(block).replace(/\n/g,'<br>')}</p>`).join('');
    const related=equipment.filter(product=>String(product._id)!==String(item._id)&&String(product.brand||'').toLowerCase()===String(item.brand||'').toLowerCase()).slice(0,3);
    const relatedMarkup=related.map(product=>`<a href="${equipmentUrl(product)}" data-related-product="${htmlEscape(String(product._id))}">${htmlEscape(`${product.brand||''} ${product.model||''}`.trim())}</a>`).join('');
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(name)} — ціна та характеристики | Voltares</title><meta name="description" content="${htmlEscape(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="uk-UA" href="${canonical}"><link rel="alternate" hreflang="x-default" href="${canonical}"><meta property="og:type" content="product"><meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="Voltares"><meta property="og:title" content="${htmlEscape(name)} — ціна та характеристики"><meta property="og:description" content="${htmlEscape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${htmlEscape(image)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/content-pages.css?v=20260719-2"><link rel="stylesheet" href="/product-page.css?v=20260719-1"><script type="application/ld+json">${jsonLd(productSchema)}</script><script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="Voltares — головна"></a><nav class="page-nav"><a href="/catalog.html">Каталог</a><a href="/faq.html">FAQ</a><a href="/calculators.html">Калькулятори</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><nav class="breadcrumbs page-container" aria-label="Хлібні крихти"><a href="/">Головна</a><span>›</span><a href="/catalog.html">Каталог</a><span>›</span><a href="/obladnannia/${htmlEscape(String(item.brand||'').toLowerCase())}.html">${htmlEscape(item.brand||'Обладнання')}</a><span>›</span><span aria-current="page">${htmlEscape(item.model||'')}</span></nav><section class="product-hero page-container"><div class="product-media"><img src="${htmlEscape(image)}" alt="${htmlEscape(name)}" width="800" height="800" fetchpriority="high"></div><div class="product-summary"><p class="page-eyebrow">${htmlEscape(item.brand||'Обладнання')} · резервне живлення</p><h1>${htmlEscape(name)}</h1><p class="page-lead">${htmlEscape(description)}</p><strong class="product-price">${htmlEscape(item.price||'Ціна за запитом')}</strong><div class="product-actions"><a class="page-button" href="/#consultation">Підібрати систему →</a><a href="/calculators.html">Розрахувати автономність</a></div></div></section><section class="page-container product-layout"><article class="article-content"><h2>Опис і переваги</h2>${body}<h2>Для кого ця модель</h2><p>${htmlEscape(name)} підходить для проєктів резервного, автономного або сонячного живлення, якщо його параметри відповідають навантаженню, батареї та схемі підключення. Остаточну сумісність має перевірити інженер.</p><h2>Що перевірити перед замовленням</h2><ul><li>пікову й постійну потужність споживачів;</li><li>тип мережі та кількість фаз;</li><li>напругу, BMS і корисну ємність акумулятора;</li><li>умови монтажу, захист і переріз кабелів;</li><li>необхідний час автономної роботи.</li></ul></article><aside class="product-specs"><h2>Характеристики</h2><dl>${specs.map(([label,value])=>`<div><dt>${htmlEscape(label)}</dt><dd>${htmlEscape(value)}</dd></div>`).join('')}</dl><p>Характеристики уточнюються перед комплектацією проєкту.</p></aside></section><section class="page-container related-block"><h2>Корисно перед вибором</h2><div><a href="/rishennia/invertor-dlia-domu.html">Як вибрати інвертор для дому</a><a href="/obladnannia/lifepo4.html">LiFePO₄ акумулятори</a><a href="/calculators.html">Калькулятор автономності</a><a href="/faq.html">Відповіді на часті питання</a><a href="/articles/5-pryladiv-iaki-zidaiut-avtonomnist.html">Що зменшує автономність</a></div></section></main><footer class="page-footer"><div class="page-container">© 2026 Voltares / ІНК · Енергетичні рішення</div></footer></body></html>`;
    const enrichedPage=page.replace('</div></section></main>',`${relatedMarkup}</div></section></main>`);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300, stale-while-revalidate=86400'});return res.end(injectPublicHead(enrichedPage));
  }
  const articleMatch=url.pathname.match(/^\/articles\/([^/]+)\.html$/);
  if(articleMatch&&!existsSync(path.join(ROOT,url.pathname))){
    const slug=decodeURIComponent(articleMatch[1]);
    const article=(await store.list('articles')).find(item=>item.slug===slug&&(item.status==='published'||item.status==='active'));
    if(!article)return json(res,404,{error:'NOT_FOUND'});
    const images=(Array.isArray(article.images)&&article.images.length?article.images:[article.image]).filter(Boolean);
    const articleCanonical=`${PUBLIC_SITE_URL}/articles/${encodeURIComponent(slug)}.html`;
    const articleImage=absoluteUrl(images[0]||'/og-voltera.svg');
    const articleBreadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Головна',item:`${PUBLIC_SITE_URL}/`},{'@type':'ListItem',position:2,name:'Статті',item:`${PUBLIC_SITE_URL}/#journal`},{'@type':'ListItem',position:3,name:article.title,item:articleCanonical}]};
    const articleExtraHead=`<link rel="alternate" hreflang="uk-UA" href="${articleCanonical}"><link rel="alternate" hreflang="x-default" href="${articleCanonical}"><meta property="og:type" content="article"><meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="Voltares"><meta property="og:title" content="${htmlEscape(article.title)}"><meta property="og:description" content="${htmlEscape(article.excerpt||article.title)}"><meta property="og:url" content="${articleCanonical}"><meta property="og:image" content="${htmlEscape(articleImage)}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${jsonLd(articleBreadcrumb)}</script>`;
    const paragraphs=String(article.body||article.excerpt||'').split(/\n{2,}/).filter(Boolean).map(text=>`<p>${htmlEscape(text).replace(/\n/g,'<br>')}</p>`).join('');
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(article.title)} | ІНК</title><meta name="description" content="${htmlEscape(article.excerpt||article.title)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://voltares.pp.ua/articles/${encodeURIComponent(slug)}.html"><link rel="stylesheet" href="/content-pages.css?v=20260718-1"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.excerpt||'',image:images,datePublished:article.createdAt,dateModified:article.updatedAt,author:{'@type':'Organization',name:'ІНК'},publisher:{'@type':'Organization',name:'ІНК',logo:{'@type':'ImageObject',url:'https://voltares.pp.ua/assets/brand/ink-logo-transparent.png'}}}).replace(/</g,'\\u003c')}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="ІНК — головна"></a><nav class="page-nav"><a href="/#journal">Журнал</a><a href="/gallery.html">Галерея</a><a href="/#contacts">Контакти</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><section class="page-hero"><div class="page-container"><p class="page-eyebrow">${htmlEscape(article.category||'Журнал')}</p><h1>${htmlEscape(article.title)}</h1><p class="page-lead">${htmlEscape(article.excerpt||'')}</p></div></section><div class="page-container article-layout"><aside class="article-aside"><a href="/">← На головну</a><a href="/#journal">Інші статті</a></aside><article class="article-content">${images.map(src=>`<img src="${htmlEscape(src)}" alt="${htmlEscape(article.title)}" loading="lazy" style="width:100%;margin:0 0 24px;border-radius:22px">`).join('')}${paragraphs}<a class="page-button" href="/#consultation">Поставити питання →</a></article></div></main><footer class="page-footer"><div class="page-container">© 2026 ІНК · Енергетичні рішення</div></footer></body></html>`;
    const enrichedArticle=page.replace('</head>',`${articleExtraHead}</head>`);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300'});return res.end(injectPublicHead(enrichedArticle));
  }
  let pathname=url.pathname==='/'?'/index.html':url.pathname;
  const requested=path.resolve(ROOT,`.${decodeURIComponent(pathname)}`);
  if(!requested.startsWith(ROOT)||requested.includes(`${path.sep}.`))return json(res,403,{error:'FORBIDDEN'});
  try{const stat=await fs.stat(requested);if(stat.isDirectory())pathname=path.join(pathname,'index.html');const file=stat.isDirectory()?path.join(requested,'index.html'):requested;const data=await fs.readFile(file);const payload=file.endsWith('.html')&&!['admin.html','admin-login.html'].includes(path.basename(file))?Buffer.from(injectPublicHead(enhanceStaticArticle(data.toString('utf8'),url.pathname))):data;res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.html')?'no-cache':'public, max-age=3600'});res.end(payload);}catch{json(res,404,{error:'NOT_FOUND'});}
}

export async function handleRequest(req,res){
  try{
    securityHeaders(res);
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    const requestHost=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().toLowerCase();
    if(requestHost.endsWith('.vercel.app')||/^\/(?:admin|api|private|preview|draft)(?:[/.]|$)/.test(url.pathname))res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(IS_PRODUCTION){
      const forwardedHost=requestHost;
      const forwardedProto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim().toLowerCase();
      if(['voltares.pp.ua','www.voltares.pp.ua'].includes(forwardedHost)&&forwardedProto==='http'){
        res.writeHead(301,{Location:`https://${forwardedHost}${url.pathname}${url.search}`});return res.end();
      }
    }
    if(url.pathname.startsWith('/api/')){const handled=await api(req,res,url);if(handled===false)json(res,404,{error:'API_NOT_FOUND'});return;}
    await serve(req,res,url);
  }catch(error){
    console.error(error);
    const status=error.message==='PAYLOAD_TOO_LARGE'?413:error.message==='UNSUPPORTED_CONTENT_TYPE'?415:error instanceof SyntaxError?400:500;
    json(res,status,{error:error.message||'SERVER_ERROR'});
  }
}
export default handleRequest;

if(!process.env.VERCEL && process.argv[1]===fileURLToPath(import.meta.url)){
  const server=http.createServer(handleRequest);
  server.listen(PORT,()=>console.log(`INK Energy: http://127.0.0.1:${PORT}`));
}
