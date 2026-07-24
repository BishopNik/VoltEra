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
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const EMAIL_FROM = String(process.env.EMAIL_FROM || 'Voltares <orders@voltares.pp.ua>').trim();
const EMAIL_REPLY_TO = String(process.env.EMAIL_REPLY_TO || 'ink.torg@gmail.com').trim();
const CONFIGURED_PUBLIC_SITE_URL = /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(String(process.env.PUBLIC_SITE_URL||''))?String(process.env.PUBLIC_SITE_URL).replace(/\/$/,''):'https://www.voltares.pp.ua';
const PUBLIC_SITE_URL = CONFIGURED_PUBLIC_SITE_URL.replace(/^https:\/\/voltares\.pp\.ua$/i,'https://www.voltares.pp.ua');
const GA4_MEASUREMENT_ID = /^G-[A-Z0-9]+$/i.test(String(process.env.GA4_MEASUREMENT_ID||''))?String(process.env.GA4_MEASUREMENT_ID).toUpperCase():'';
const CLARITY_PROJECT_ID = /^[a-z0-9]+$/i.test(String(process.env.CLARITY_PROJECT_ID||''))?String(process.env.CLARITY_PROJECT_ID):'';
const GOOGLE_SITE_VERIFICATION = String(process.env.GOOGLE_SITE_VERIFICATION||'').trim().slice(0,200).replace(/[^a-zA-Z0-9_\-.]/g,'');
const ANALYTICS_DEBUG = /^(1|true|yes)$/i.test(String(process.env.ANALYTICS_DEBUG||''));
const COLLECTIONS = new Set(['leads','reviews','questions','faqs','projects','articles','equipment','solarPanels','greenProtect','quotes','purchases','users']);
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
const PV_CATALOG_MEDIA_MIGRATION_ID = 'set-pv-catalog-media-and-usage-2026-07-21-v2';
const PUBLIC_PROPOSALS_MIGRATION_ID = 'public-commercial-proposals-2026-07-22-v1';
const SUPPLIER_CATALOG_MIGRATION_ID = 'supplier-catalog-and-prices-2026-07-23-v1';
const PRODUCT_SUPPLIER_MIGRATION_ID = 'select-best-product-supplier-2026-07-23-v1';
const SUPPLIER_OLEKSANDR = 'Олександр Городоцька';
const SUPPLIER_PRAVYLNE = 'Правильне електроживлення';
const SUPPLIER_ETI = 'ETI Україна';
const EQUIPMENT_RETAIL_PRICES = Object.freeze({
  'SE-G5.1 Pro-B':'38 500 грн',
  'SE-F5 Pro-C':'37 900 грн',
  'RW-F16':'94 900 грн',
  'FLA48314-EU':'89 900 грн',
  'SUN-6K-SG05LP1-AM2-P':'35 900 грн',
  'SUN-8K-SG01LP1-EU':'52 900 грн',
  'SUN-10K-SG02LP1-EU-AM3':'74 900 грн',
  'SUN-12K-SG02LP1-EU-AM3':'76 900 грн',
  'SUN-12K-SG05LP3-EU':'78 900 грн',
  'SUN-15K-SG05LP3-EU-SM2':'89 900 грн',
  'SUN-20K-SG05LP3-EU-SM2':'119 900 грн',
  'SUN-30K-SG02HP3-EU-BM3':'129 900 грн',
  'SUN-50K-SG01HP3-EU-BM4':'201 900 грн',
  'SUN-80K-SG02HP3-EU-EM6':'264 900 грн',
  'BOS-G PRO':'38 500 грн',
  'BOS-G-PDU-2 BMS':'37 500 грн',
  'Стійка BOS-G PRO на 12 АКБ':'17 900 грн',
  'ANJ-LP04-24V-100A-PX':'15 900 грн',
  'ANJ-6200W-48V-W':'13 900 грн',
  'ANJ-4000W-24V-W':'10 900 грн'
});
// Purchase values are deliberately kept in the authenticated CRM payload only.
const EQUIPMENT_COMMERCE = Object.freeze({
  'SE-G5.1 Pro-B':{priceUsd:870,purchasePrice:760,purchaseCurrency:'USD',supplier:SUPPLIER_PRAVYLNE},
  'SE-F5 Pro-C':{priceUsd:860,purchasePrice:750,purchaseCurrency:'USD',supplier:SUPPLIER_PRAVYLNE},
  'RW-F16':{priceUsd:2140,purchasePrice:1820,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'FLA48314-EU':{priceUsd:2030,purchasePrice:1770,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-6K-SG05LP1-AM2-P':{priceUsd:815,purchasePrice:770,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-8K-SG01LP1-EU':{priceUsd:1195,purchasePrice:1080,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-10K-SG02LP1-EU-AM3':{priceUsd:1695,purchasePrice:1530,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-12K-SG02LP1-EU-AM3':{priceUsd:1740,purchasePrice:1570,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-12K-SG05LP3-EU':{priceUsd:1785,purchasePrice:1600,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-15K-SG05LP3-EU-SM2':{priceUsd:2035,purchasePrice:1800,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-20K-SG05LP3-EU-SM2':{priceUsd:2710,purchasePrice:2370,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-30K-SG02HP3-EU-BM3':{priceUsd:2940,purchasePrice:2620,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'SUN-50K-SG01HP3-EU-BM4':{priceUsd:4570,purchasePrice:4100,purchaseCurrency:'USD',supplier:SUPPLIER_PRAVYLNE},
  'SUN-80K-SG02HP3-EU-EM6':{priceUsd:5990,purchasePrice:5520,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'BOS-G PRO':{priceUsd:870,purchasePrice:750,purchaseCurrency:'USD',supplier:SUPPLIER_PRAVYLNE},
  'BOS-G-PDU-2 BMS':{priceUsd:850,purchasePrice:750,purchaseCurrency:'USD',supplier:SUPPLIER_PRAVYLNE},
  'Стійка BOS-G PRO на 12 АКБ':{priceUsd:410,purchasePrice:340,purchaseCurrency:'USD',supplier:SUPPLIER_PRAVYLNE},
  'ANJ-LP04-24V-100A-PX':{priceUsd:360,purchasePrice:290,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'ANJ-6200W-48V-W':{priceUsd:315,purchasePrice:240,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR},
  'ANJ-4000W-24V-W':{priceUsd:250,purchasePrice:190,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR}
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
    _id:'deye-rw-f16', brand:'DEYE', model:'RW-F16', power:'16 kWh', phase:'LiFePO₄', voltage:'51.2 V', price:EQUIPMENT_RETAIL_PRICES['RW-F16'], status:'active',
    images:['https://deye.com/wp-content/uploads/2025/01/rw-f16-768x768.jpg'],
    description:'DEYE RW-F16 — низьковольтний акумулятор LiFePO₄ 51.2 В, 314 А·год із номінальною ємністю 16 кВт·год для резервного та автономного живлення будинку або бізнесу.\n\n## Основні переваги\n\n- Ємність 16 кВт·год\n- Корисна енергія 14.4 кВт·год\n- Потужність до 8 кВт\n- Понад 6000 циклів\n- Струм заряду та розряду до 160 А\n- До 32 батарей паралельно\n- Віддалений моніторинг через інвертор Deye\n- Настінний або підлоговий монтаж'
  },
  {
    _id:'felicity-fla48314-eu', brand:'FELICITY SOLAR', model:'FLA48314-EU', power:'16 kWh', phase:'LiFePO₄', voltage:'51.2 V', price:EQUIPMENT_RETAIL_PRICES['FLA48314-EU'], status:'active',
    images:['https://eu.felicitysolar.com/wp-content/uploads/2025/06/FLA48314-EU.82.png'],
    description:'Felicity Solar FLA48314-EU — низьковольтний акумулятор LiFePO₄ 51.2 В на 16 кВт·год для домашніх і комерційних систем накопичення енергії. Модель адаптована до роботи за низьких температур і підтримує віддалений моніторинг.\n\n## Основні переваги\n\n- Ємність 16 кВт·год\n- LiFePO₄ 51.2 В\n- Понад 8000 циклів\n- Вбудована BMS\n- Wi-Fi та Bluetooth\n- RS485 / CAN\n- Масштабування до 240 кВт·год\n- Підігрів для роботи в холодний період'
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
  ['tw-solar-440-bf','TW Solar','TWMND-54HB440W BF','440 W','N-type · двостороння',75.4,3990,90,'https://static.tildacdn.one/stor6161-6136-4830-a362-336632633732/37745904.jpg','https://soncedar.org/equipment/solar_panel/tproduct/331143915-702966801902-tw-solar-tongwei-440-vt-monokristalchna','дахових і наземних домашніх СЕС'],
  ['suntech-440-bf','Suntech','STP440S-C54/Nshb BF','440 W','N-type · двостороння',75.4,3990,90,'https://static.wixstatic.com/media/264abb_2d650a535d064493a3f0c9db305f897e~mv2.png/v1/fit/w_500,h_500,q_90/file.png','https://www.suntech-power.com/wp-content/uploads/download/product-specification/EN_STP420-440S-C54-Nshb.pdf','дахових і наземних домашніх СЕС'],
  ['sunova-610','Sunova','SS-BG610-66MDH','610 W','Mono · двостороння',99.55,4990,113,'https://www.meugerador.com.br/cdn/shop/files/Painel_Solar_Sunova_610W_Bifacial_Frame_Aluminio_Diagonal.png?v=1779799728','https://www.sunova-solar.com/attached/file/en/datasheet/L-Series/Tangra%20L%20Pro%20HD%20%28610-630%29-66MDH-G11-30mm.pdf','великих дахових, наземних і комерційних СЕС'],
  ['aiko-610','AIKO','A610-MAH72Mw','610 W','ABC N-type',108.7,5290,120,'https://www.solarics.de/cdn/shop/files/Solarics_3f77f80f-1375-4413-ae80-03002e471859.png?v=1709740257','https://www.solarics.de/products/aiko-solarmodul-aiko-a610-mah72mw','дахових, наземних і комерційних СЕС'],
  ['longi-615-bf','LONGi','Hi-MO X10 615W BF','615 W','N-type · двостороння',106.5,5290,120,'https://static.longi.com/Images_412x612_11869e6bbf.png','https://www.longi.com/en/products/modules/hi-mo-7/','великих дахових, наземних і комерційних СЕС'],
  ['longi-630','LONGi','Hi-MO 7 630W','630 W','N-type',105.8,5290,120,'https://static.longi.com/Images_412x612_11869e6bbf.png','https://www.longi.com/en/products/modules/hi-mo-7/','наземних і промислових СЕС'],
  ['tw-solar-640-bf','TW Solar','TWMNH-66HD640W BF','640 W','N-type · двостороння',107.4,5390,122,'https://vinur.com.ua/image/catalog/product/7063/sonyachna-batareya-640vt-n-type-dual-glass-bifacial-twmnh-66hd640-cable-400-200-mm-tongwei-jpg-1.jpg','https://vinur.com.ua/ua/products/solnechnie-batarei/komplektuyushie/solnechnye-paneli/twmnh-66hd640','наземних і промислових СЕС'],
  ['aiko-645-bf','AIKO','A645-MAH78Db BF','645 W','ABC N-type · двостороння',106.43,5490,124,'https://aikosolar.com/wp-content/uploads/2024/11/Polaris-1N-Plus-66-Dual-Glass-635W-665W-detail.jpg','https://aikosolar.com/en/products/stellar-1nplus66-dual-glass/','наземних, комерційних і промислових СЕС'],
  ['longi-620-bf','LONGi','LR8-66HGD-620M BF','620 W','N-type · двостороння',102.3,4790,108,'https://static.longi.com/Images_412x612_11869e6bbf.png','https://www.longi.com/en/products/modules/hi-mo-7/','великих дахових, наземних і комерційних СЕС'],
  ['jinko-620-bf','Jinko Solar','JKM620N-66HL4M-BDV','620 W','TOPCon N-type · двостороння',102.3,5190,117,'https://vencon.ua/uploads/goods/352689/main/jinko-solar-jkm-620n-66hl4m-bdv-bifacial-620vt.jpg','https://www.jinkosolar.com/uploads/JKM600-625N-66HL4M-BDV-F1-EN.pdf','дахових, наземних і промислових СЕС'],
  ['jetion-620-bf','Jetion Solar','JT620SLt(B)','620 W','TOPCon N-type · двостороння',97.34,4790,108,'/assets/catalog/solar-panel.svg','https://www.jetion.com.cn/Upload/2026/05/dce85b0f45e44254a9f0616d0d50a8e5.pdf','дахових, наземних і промислових СЕС']
].map(([_id,brand,model,power,technology,purchasePrice,price,priceUsd,image,sourceUrl,usage],homeOrder)=>({_id,brand,model,power,technology,phase:technology,voltage:'',purchasePrice,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR,price:`${price.toLocaleString('uk-UA')} грн`,priceUsd,description:`${brand} ${model} — сонячна панель ${power} для ${usage}. Панель можна придбати окремо або разом із комплектом для підключення.`,sourceUrl,images:[image],status:'active',homeOrder:homeOrder+1}));

const etiProductId=code=>String(code).padStart(9,'0');
const etiUsage=category=>({
  'Автоматичні вимикачі':'захисту DC-ліній сонячної станції від перевантаження та короткого замикання',
  'Запобіжники gPV':'захисту фотоелектричних стрінгів від надструму та короткого замикання',
  'Тримачі запобіжників':'встановлення та безпечної заміни gPV-запобіжників у DC-щиті',
  'Захист від перенапруги':'захисту інвертора й DC-ліній СЕС від імпульсних та грозових перенапруг',
  'DC роз’єднувачі':'ручного безпечного відключення сонячних панелей від інвертора',
  'Рубильники навантаження':'комутації та ізоляції високострумових DC-ліній сонячної станції'
}[category]||'побудови та захисту електричних кіл сонячної станції');
const etiProduct=(code,name,category,listPrice,spec='')=>({
  _id:`eti-${code}`,code,brand:'ETI',model:name,name,category,listPrice,
  purchasePrice:Math.round(listPrice*0.65),purchaseCurrency:'UAH',supplier:SUPPLIER_ETI,
  price:`${Math.round(listPrice*0.85).toLocaleString('uk-UA')} грн`,priceUsd:0,
  power:spec,phase:category,voltage:'DC',spec,
  description:`${name} використовується для ${etiUsage(category)}. Компонент можна придбати окремо у потрібній кількості.`,
  sourceUrl:`https://www.eti.ua/produktsiya-ua/${etiProductId(code)}`,
  images:[`https://www.eti.ua/media/eti/images/product_db/idents/${etiProductId(code)}/en-GB/photo/${etiProductId(code)}_Photo.webp`],status:'active'
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
const REQUESTED_INSTALLATION_COMPONENTS = [
  {
    _id:'mounting-profile-41x41',code:'MOUNT-4141',brand:'Монтажні системи',model:'Оцинкований профіль 41×41',name:'Оцинкований профіль 41×41',
    category:'Монтажні комплектуючі',spec:'41×41 мм · 1 м.п.',power:'41×41 мм',phase:'Профіль',voltage:'1 м.п.',
    purchasePrice:2.6,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR,price:'149 грн/м.п.',priceUsd:3.4,
    description:'Оцинкований монтажний профіль 41×41 мм для кріплення сонячних панелей, кабельних трас та обладнання СЕС. Відпускається погонними метрами.',
    sourceUrl:'',images:['/assets/catalog/green-protect.svg'],status:'active'
  },
  {
    _id:'mounting-screw-m10-1-5-200',code:'M10-1.5-200',brand:'Монтажні системи',model:'Гвинт-шуруп М10×1.5×200',name:'Гвинт-шуруп М10×1.5×200',
    category:'Монтажні комплектуючі',spec:'M10 · 200 мм · 1 шт.',power:'M10×200 мм',phase:'Кріплення',voltage:'1 шт.',
    purchasePrice:1.3,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR,price:'79 грн/шт.',priceUsd:1.8,
    description:'Гвинт-шуруп М10×1.5×200 мм для надійного монтажу профілю та конструкцій сонячної електростанції. Продається поштучно.',
    sourceUrl:'',images:['/assets/catalog/green-protect.svg'],status:'active'
  },
  {
    _id:'kbe-solar-cable-6mm',code:'KBE-PV-6MM',brand:'KBE',model:'Сонячний кабель KBE 6 мм²',name:'Сонячний кабель KBE 6 мм²',
    category:'Кабелі для СЕС',spec:'6 мм² · 1 м.п.',power:'6 мм²',phase:'PV-кабель',voltage:'DC · 1 м.п.',
    purchasePrice:1.3,purchaseCurrency:'USD',supplier:SUPPLIER_OLEKSANDR,price:'79 грн/м.п.',priceUsd:1.8,
    description:'Спеціалізований кабель KBE перерізом 6 мм² для DC-ліній фотоелектричних систем. Стійкий до ультрафіолету та зовнішнього монтажу, відпускається погонними метрами.',
    sourceUrl:'',images:['/assets/catalog/green-protect.svg'],status:'active'
  }
];

const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8','.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.xls':'application/vnd.ms-excel','.webmanifest':'application/manifest+json' };
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
    if(!this.data._migrations.includes(PV_CATALOG_MEDIA_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const [type,records] of [['solarPanels',REQUESTED_SOLAR_PANELS],['greenProtect',REQUESTED_GREEN_PROTECT]]){
        for(const source of records){
          const item=this.data[type].find(entry=>source.code?String(entry.code)===String(source.code):String(entry.model)===String(source.model));
          if(item)Object.assign(item,{images:source.images,description:source.description,sourceUrl:source.sourceUrl,updatedAt:now});
        }
      }
      this.data._migrations.push(PV_CATALOG_MEDIA_MIGRATION_ID); changed=true;
    }
    if(!this.data._migrations.includes(SUPPLIER_CATALOG_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const source of REQUESTED_EQUIPMENT){
        const commerce=EQUIPMENT_COMMERCE[source.model]||{};
        const item=this.data.equipment.find(entry=>String(entry.model)===String(source.model));
        if(item)Object.assign(item,{price:source.price,...commerce,updatedAt:now});
        else this.data.equipment.push({...source,...commerce,createdAt:now,updatedAt:now});
      }
      for(const source of REQUESTED_SOLAR_PANELS){
        const item=this.data.solarPanels.find(entry=>String(entry.model)===String(source.model));
        const commerce={purchasePrice:source.purchasePrice,purchaseCurrency:source.purchaseCurrency,price:source.price,priceUsd:source.priceUsd};
        if(item)Object.assign(item,commerce,{updatedAt:now});
        else this.data.solarPanels.push({...source,createdAt:now,updatedAt:now});
      }
      for(const source of REQUESTED_INSTALLATION_COMPONENTS){
        const item=this.data.greenProtect.find(entry=>String(entry.code)===String(source.code));
        if(item)Object.assign(item,{...source,_id:item._id,updatedAt:now});
        else this.data.greenProtect.push({...source,createdAt:now,updatedAt:now});
      }
      this.data._migrations.push(SUPPLIER_CATALOG_MIGRATION_ID); changed=true;
    }
    if(!this.data._migrations.includes(PRODUCT_SUPPLIER_MIGRATION_ID)){
      const now=new Date().toISOString();
      for(const item of this.data.equipment){
        const commerce=EQUIPMENT_COMMERCE[String(item.model||'').trim()];
        const price=EQUIPMENT_RETAIL_PRICES[String(item.model||'').trim()];
        if(commerce)Object.assign(item,{...commerce,...(price?{price}:{}),updatedAt:now});
      }
      for(const source of REQUESTED_SOLAR_PANELS){
        const item=this.data.solarPanels.find(entry=>String(entry.model)===String(source.model));
        if(item)Object.assign(item,{supplier:source.supplier,updatedAt:now});
      }
      for(const source of [...REQUESTED_GREEN_PROTECT,...REQUESTED_INSTALLATION_COMPONENTS]){
        const item=this.data.greenProtect.find(entry=>String(entry.code)===String(source.code));
        if(item)Object.assign(item,{supplier:source.supplier,updatedAt:now});
      }
      this.data._migrations.push(PRODUCT_SUPPLIER_MIGRATION_ID); changed=true;
    }
    for(const review of this.data.reviews||[]){ if(review.verified===undefined){ review.verified=false; review.verifiedBy=''; review.verifiedAt=null; review.audit=[]; changed=true; } if(!Array.isArray(review.audit)){ review.audit=[]; changed=true; } }
    if(!this.data._migrations.includes(PUBLIC_PROPOSALS_MIGRATION_ID)){
      for(const quote of this.data.quotes||[]){
        const legacyStatus={accepted:'confirmed',completed:'confirmed',declined:'cancelled'}[quote.status];
        Object.assign(quote,{
          status:legacyStatus||(['draft','sent','viewed','confirmed','cancelled'].includes(quote.status)?quote.status:'draft'),
          publicToken:quote.publicToken||null,publicEnabled:Boolean(quote.publicEnabled),sentAt:quote.sentAt||null,
          firstViewedAt:quote.firstViewedAt||null,lastViewedAt:quote.lastViewedAt||null,viewsCount:Number(quote.viewsCount||0),
          confirmedAt:quote.confirmedAt||null,lastClientActivityAt:quote.lastClientActivityAt||null,
          adminViewedActivityAt:quote.adminViewedActivityAt||null,previousVersionId:quote.previousVersionId||null,
          nextVersionId:quote.nextVersionId||null,version:Math.max(1,Number(quote.version||1)),
          confirmationNotificationSentAt:quote.confirmationNotificationSentAt||null
        });
      }
      this.data._migrations.push(PUBLIC_PROPOSALS_MIGRATION_ID);changed=true;
    }
    if(changed)await this.persist();
  }
  async persist(){ const tmp=`${this.file}.tmp`; await fs.writeFile(tmp,JSON.stringify(this.data,null,2)); await fs.rename(tmp,this.file); }
  async list(type){ return [...(this.data[type]||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
  async create(type,payload){ const now=new Date().toISOString(); const item={...payload,_id:crypto.randomUUID(),createdAt:now,updatedAt:now}; if(['leads','reviews','questions'].includes(type)&&item.viewedAt===undefined)item.viewedAt=null; this.data[type].push(item); await this.persist(); return item; }
  async update(type,id,payload){ const item=this.data[type].find(x=>String(x._id)===id); if(!item)return null; Object.assign(item,payload,{updatedAt:new Date().toISOString()}); if(type==='equipment')delete item.image; delete item._id; item._id=id; await this.persist(); return item; }
  async remove(type,id){ const index=this.data[type].findIndex(x=>String(x._id)===id); if(index<0)return false; this.data[type].splice(index,1); await this.persist(); return true; }
  async markViewed(type){ const now=new Date().toISOString(); (this.data[type]||[]).forEach(item=>{if(!item.viewedAt)item.viewedAt=now;}); await this.persist(); }
  async incrementEquipmentViews(id){ const item=this.data.equipment.find(entry=>String(entry._id)===String(id)); if(!item)return null; item.views=Number(item.views||0)+1; await this.persist(); return item.views; }
  async quoteByToken(token){ return this.data.quotes.find(item=>item.publicToken===token)||null; }
  async recordQuoteView(token,now){
    const operation=this.queue.then(async()=>{const item=await this.quoteByToken(token);if(!item||!item.publicEnabled)return null;if(item.status==='sent')item.status='viewed';if(!item.firstViewedAt)item.firstViewedAt=now;Object.assign(item,{lastViewedAt:now,viewsCount:Number(item.viewsCount||0)+1,lastClientActivityAt:now,updatedAt:now});await this.persist();return item;});
    this.queue=operation.catch(()=>{});return operation;
  }
  async confirmQuote(token,now){
    const operation=this.queue.then(async()=>{const item=await this.quoteByToken(token);if(!item||!item.publicEnabled)return {quote:item,changed:false};if(!['sent','viewed'].includes(item.status))return {quote:item,changed:false};Object.assign(item,{status:'confirmed',confirmedAt:now,lastClientActivityAt:now,updatedAt:now});await this.persist();return {quote:item,changed:true};});
    this.queue=operation.catch(()=>{});return operation;
  }
}

class MongoStore {
  constructor(client,db,ObjectId){ this.client=client; this.db=db; this.ObjectId=ObjectId; }
  async init(){
    for(const name of COLLECTIONS) await this.db.collection(name).createIndex({createdAt:-1});
    await this.db.collection('users').createIndex({username:1},{unique:true});
    await this.db.collection('quotes').updateMany({publicToken:null},{$unset:{publicToken:''}});
    await this.db.collection('quotes').createIndex({publicToken:1},{unique:true,sparse:true});
    // Public catalogue images and private CRM documents may contain identical
    // bytes, but they must never share an access policy.
    try{await this.db.collection('media').dropIndex('sha256_1');}catch(error){if(error?.codeName!=='IndexNotFound'&&error?.code!==27)throw error;}
    await this.db.collection('media').createIndex({sha256:1,access:1},{unique:true});
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
    if(!await migrations.findOne({_id:PV_CATALOG_MEDIA_MIGRATION_ID})){
      const now=new Date().toISOString();
      for(const [type,records] of [['solarPanels',REQUESTED_SOLAR_PANELS],['greenProtect',REQUESTED_GREEN_PROTECT]]){
        for(const source of records){
          const identity=source.code?{code:source.code}:{model:source.model};
          await this.db.collection(type).updateMany(identity,{$set:{images:source.images,description:source.description,sourceUrl:source.sourceUrl,updatedAt:now}});
        }
      }
      try{await migrations.updateOne({_id:PV_CATALOG_MEDIA_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:SUPPLIER_CATALOG_MIGRATION_ID})){
      const now=new Date().toISOString();
      for(const source of REQUESTED_EQUIPMENT){
        const {_id,price,...catalogue}=source;
        const commerce=EQUIPMENT_COMMERCE[source.model]||{};
        await this.db.collection('equipment').updateOne(
          {model:source.model},
          {$set:{price,...commerce,updatedAt:now},$setOnInsert:{...catalogue,createdAt:now}},
          {upsert:true}
        );
      }
      for(const source of REQUESTED_SOLAR_PANELS){
        const {_id,purchasePrice,purchaseCurrency,price,priceUsd,...catalogue}=source;
        await this.db.collection('solarPanels').updateOne(
          {model:source.model},
          {$set:{purchasePrice,purchaseCurrency,price,priceUsd,updatedAt:now},$setOnInsert:{...catalogue,createdAt:now}},
          {upsert:true}
        );
      }
      for(const source of REQUESTED_INSTALLATION_COMPONENTS){
        const {_id,...catalogue}=source;
        await this.db.collection('greenProtect').updateOne(
          {code:source.code},
          {$set:{...catalogue,updatedAt:now},$setOnInsert:{createdAt:now}},
          {upsert:true}
        );
      }
      try{await migrations.updateOne({_id:SUPPLIER_CATALOG_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    if(!await migrations.findOne({_id:PRODUCT_SUPPLIER_MIGRATION_ID})){
      const now=new Date().toISOString();
      for(const [model,commerce] of Object.entries(EQUIPMENT_COMMERCE)){
        const price=EQUIPMENT_RETAIL_PRICES[model];
        await this.db.collection('equipment').updateMany({model},{$set:{...commerce,...(price?{price}:{}),updatedAt:now}});
      }
      for(const source of REQUESTED_SOLAR_PANELS){
        await this.db.collection('solarPanels').updateMany({model:source.model},{$set:{supplier:source.supplier,updatedAt:now}});
      }
      for(const source of [...REQUESTED_GREEN_PROTECT,...REQUESTED_INSTALLATION_COMPONENTS]){
        await this.db.collection('greenProtect').updateMany({code:source.code},{$set:{supplier:source.supplier,updatedAt:now}});
      }
      try{await migrations.updateOne({_id:PRODUCT_SUPPLIER_MIGRATION_ID},{$setOnInsert:{completedAt:now}},{upsert:true});}
      catch(error){if(error?.code!==11000)throw error;}
    }
    await this.db.collection('reviews').updateMany({verified:{$exists:false}},{$set:{verified:false,verifiedBy:'',verifiedAt:null,audit:[]}});
    await this.db.collection('reviews').updateMany({audit:{$exists:false}},{$set:{audit:[]}});
    await this.db.collection('quotes').updateMany({status:'accepted'},{$set:{status:'confirmed'}});
    await this.db.collection('quotes').updateMany({status:'completed'},{$set:{status:'confirmed'}});
    await this.db.collection('quotes').updateMany({status:'declined'},{$set:{status:'cancelled'}});
    await this.db.collection('quotes').updateMany({publicEnabled:{$exists:false}},{$set:{publicEnabled:false,sentAt:null,firstViewedAt:null,lastViewedAt:null,viewsCount:0,confirmedAt:null,lastClientActivityAt:null,adminViewedActivityAt:null,previousVersionId:null,nextVersionId:null,version:1,confirmationNotificationSentAt:null}});
  }
  id(id){ try{return new this.ObjectId(id)}catch{return id} }
  clean(doc){ if(!doc)return doc; return {...doc,_id:String(doc._id)}; }
  async list(type){ return (await this.db.collection(type).find({}).sort({createdAt:-1}).toArray()).map(x=>this.clean(x)); }
  async create(type,payload){ const now=new Date().toISOString(); const item={...payload,createdAt:now,updatedAt:now}; if(['leads','reviews','questions'].includes(type)&&item.viewedAt===undefined)item.viewedAt=null; const result=await this.db.collection(type).insertOne(item); return this.clean({...item,_id:result.insertedId}); }
  async update(type,id,payload){ const update={...payload,updatedAt:new Date().toISOString()}; delete update._id; const operation={$set:update}; if(type==='equipment')operation.$unset={image:''}; const result=await this.db.collection(type).findOneAndUpdate({_id:this.id(id)},operation,{returnDocument:'after'}); return this.clean(result); }
  async remove(type,id){ return (await this.db.collection(type).deleteOne({_id:this.id(id)})).deletedCount>0; }
  async markViewed(type){ await this.db.collection(type).updateMany({viewedAt:null},{$set:{viewedAt:new Date().toISOString()}}); }
  async incrementEquipmentViews(id){ const result=await this.db.collection('equipment').findOneAndUpdate({_id:this.id(id),status:'active'},{$inc:{views:1}},{returnDocument:'after',projection:{views:1}}); return result?Number(result.views||0):null; }
  async quoteByToken(token){ return this.clean(await this.db.collection('quotes').findOne({publicToken:token})); }
  async recordQuoteView(token,now){
    const result=await this.db.collection('quotes').findOneAndUpdate(
      {publicToken:token,publicEnabled:true,status:{$ne:'cancelled'}},
      [{$set:{status:{$cond:[{$eq:['$status','sent']},'viewed','$status']},firstViewedAt:{$ifNull:['$firstViewedAt',now]},lastViewedAt:now,viewsCount:{$add:[{$ifNull:['$viewsCount',0]},1]},lastClientActivityAt:now,updatedAt:now}}],
      {returnDocument:'after'}
    );
    return this.clean(result);
  }
  async confirmQuote(token,now){
    const result=await this.db.collection('quotes').findOneAndUpdate(
      {publicToken:token,publicEnabled:true,status:{$in:['sent','viewed']}},
      {$set:{status:'confirmed',confirmedAt:now,lastClientActivityAt:now,updatedAt:now}},
      {returnDocument:'after'}
    );
    if(result)return {quote:this.clean(result),changed:true};
    return {quote:await this.quoteByToken(token),changed:false};
  }
  async saveMedia(data,contentType,access='public'){
    const sha256=crypto.createHash('sha256').update(data).digest('hex');
    const now=new Date().toISOString();
    const safeAccess=access==='private'?'private':'public';
    await this.db.collection('media').updateOne({sha256,access:safeAccess},{$setOnInsert:{data,contentType,sha256,access:safeAccess,createdAt:now}},{upsert:true});
    const media=await this.db.collection('media').findOne({sha256,access:safeAccess},{projection:{_id:1}});
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

async function hydrateQuoteItemSnapshots(items=[],currency='UAH'){
  const groups=await Promise.all(['equipment','solarPanels','greenProtect'].map(async type=>(await store.list(type)).map(item=>({...item,_collection:type}))));
  const catalog=groups.flat();
  return sanitizeQuoteItems(items).map(item=>{
    const product=item.kind==='catalog'?catalog.find(entry=>entry._collection===item.collection&&String(entry._id)===String(item.productId)):null;
    const description=item.shortDescription||item.description||[product?.power||product?.spec,product?.phase||product?.technology||product?.category,product?.voltage].filter(Boolean).join(' · ');
    const image=item.image||(product?normalizedEquipmentImages(product)[0]:'')||'';
    const productSlug=item.productSlug||String(product?._id||item.productId||'');
    const productUrl=item.productUrl||(product&&productSlug?`/products/${productSlug}`:'');
    return {...item,productSlug,productUrl,image,shortDescription:description,currency,total:Number(item.quantity)*Number(item.unitPrice)*(1-Number(item.discount||0)/100)};
  });
}

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
  res.setHeader('Content-Security-Policy',`default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com https://www.googletagmanager.com https://*.clarity.ms; connect-src 'self' https://vercel.live https://api-contact-tg.a-nikanorov.workers.dev https://vitals.vercel-insights.com https://www.google-analytics.com https://region1.google-analytics.com https://*.clarity.ms; frame-src https://vercel.live https://www.google.com https://maps.google.com${upgrade}`);
}
function json(res,status,data,headers={}){ securityHeaders(res); res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}); res.end(JSON.stringify(data)); }
function publicJson(req,res,data){
  const payload=JSON.stringify(data);
  const etag=`"${crypto.createHash('sha1').update(payload).digest('base64url')}"`;
  const headers={'Cache-Control':'public, max-age=30, stale-while-revalidate=300','ETag':etag};
  securityHeaders(res);
  if(String(req.headers['if-none-match']||'').split(/\s*,\s*/).includes(etag)){
    res.writeHead(304,headers);
    return res.end();
  }
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8',...headers});
  return res.end(payload);
}
function htmlEscape(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));}
function absoluteUrl(value=''){
  const source=String(value||'').trim();
  if(!source)return '';
  return source.startsWith('http://')||source.startsWith('https://')?source:`https://www.voltares.pp.ua${source.startsWith('/')?'':'/'}${source}`;
}
function priceAmount(value=''){
  const digits=String(value||'').replace(/[^\d]/g,'');
  return digits?String(Number(digits)):'';
}
function equipmentUrl(item={}){return `/products/${encodeURIComponent(String(item._id||'').trim())}`}
function jsonLd(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
const SEO_CATEGORIES=Object.freeze({
  inverters:{collections:['equipment'],name:'Гібридні інвертори',title:'Гібридні інвертори для дому та бізнесу | Voltares',description:'Однофазні й трифазні гібридні інвертори для резервного живлення та сонячних електростанцій. Порівняння потужності, фаз і напруги АКБ.',intro:'Гібридний інвертор керує мережею, акумулятором і сонячними панелями. Вибір залежить від пікового навантаження, кількості фаз, напруги батареї та майбутнього розширення системи.',match:item=>/фаз/i.test(String(item.phase||''))&&/kw/i.test(String(item.power||''))&&!/kwh|lifepo|bms|акб/i.test([item.power,item.phase,item.model].join(' '))},
  batteries:{collections:['equipment'],name:'LiFePO₄ акумулятори',title:'LiFePO4 акумулятори для інвертора | Voltares',description:'LiFePO4 батареї для резервного й автономного живлення: ємність, напруга, BMS, сумісність і модульне розширення системи.',intro:'LiFePO₄ акумулятор обирають за корисною енергією, напругою, струмом BMS і протоколом зв’язку з інвертором. Для точного розрахунку важливий реальний профіль навантаження.',match:item=>/kwh|lifepo|bms|акб/i.test([item.power,item.phase,item.model].join(' '))},
  solar:{collections:['solarPanels','greenProtect'],name:'Обладнання для сонячних систем',title:'Сонячні панелі та захист СЕС | Voltares',description:'Сонячні панелі та компоненти захисту Green Protect для домашніх і комерційних СЕС.',intro:'У цьому розділі зібрані сонячні панелі, DC-захист, запобіжники, роз’єднувачі та інші компоненти, які можна придбати окремо або додати до комплектації станції.',match:()=>true}
});
function injectPublicHead(page=''){
  const source=String(page);
  const markup=[];
  if(GOOGLE_SITE_VERIFICATION&&!source.includes('name="google-site-verification"'))markup.push(`<meta name="google-site-verification" content="${htmlEscape(GOOGLE_SITE_VERIFICATION)}">`);
  if(!source.includes('/header-consistency.css'))markup.push('<link rel="stylesheet" href="/header-consistency.css?v=20260721-1">');
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
function isQuoteOwner(user={},quote={}){
  if(quote.ownerId)return String(quote.ownerId)===String(user.id||'');
  if(quote.createdBy)return String(quote.createdBy).toLowerCase()===String(user.name||'').toLowerCase();
  return user.role==='admin';
}
function canAccessQuote(user={},quote={}){
  if(isQuoteOwner(user,quote))return true;
  const shared=Array.isArray(quote.sharedWith)?quote.sharedWith.map(String):[];
  return shared.includes(String(user.id||''))||shared.some(value=>value.toLowerCase()===String(user.name||'').toLowerCase());
}
async function sanitizeQuoteShares(value,ownerId=''){
  if(!Array.isArray(value))return [];
  const requested=new Set(value.map(item=>String(item||'').trim()).filter(Boolean));
  const users=await store.list('users');
  return users.filter(user=>user.status==='active'&&String(user._id)!==String(ownerId)&&requested.has(String(user._id))).map(user=>String(user._id));
}
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
function sanitize(type,input){ const allowed={leads:['name','phone','email','city','object','need','comment','items','status','manager','checkedBy','viewedAt','attribution','emailCopySent','emailCopyId','emailCopyError'],reviews:['name','city','rating','text','reply','status','verified','viewedAt'],questions:['author','city','title','status','likes','answers','viewedAt'],faqs:['question','answer','status','order'],projects:['title','city','type','description','image','images','primaryImage','status'],articles:['title','slug','excerpt','body','category','status','image','images'],equipment:['brand','model','power','phase','voltage','price','priceUsd','purchasePrice','purchaseCurrency','supplier','description','status','images','homeMode','homeOrder'],solarPanels:['brand','model','power','technology','phase','voltage','price','priceUsd','purchasePrice','purchaseCurrency','supplier','description','sourceUrl','status','images','homeOrder'],greenProtect:['code','brand','model','name','category','spec','power','phase','voltage','listPrice','purchasePrice','purchaseCurrency','supplier','price','priceUsd','description','sourceUrl','status','images'],quotes:['number','customerName','company','email','phone','city','validUntil','note','items','currency','subtotal','status','sharedWith','sourceLeadId','sentAt','emailStatus','emailId','emailError'],purchases:['supplier','date','amount','currency','customer','list','comment','status','attachments','createdBy']}[type]||[]; return Object.fromEntries(allowed.filter(k=>input[k]!==undefined).map(k=>[k,input[k]])); }

function cleanText(value='',limit=500){return String(value??'').trim().slice(0,limit)}
function validEmail(value=''){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())}
function clampNumber(value,min=0,max=1_000_000_000){const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,number)):min}
function sanitizeLeadItems(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,60).map(item=>({
    collection:['equipment','solarPanels','greenProtect'].includes(item?.collection)?item.collection:'equipment',
    id:cleanText(item?.id,120),
    quantity:Math.round(clampNumber(item?.quantity,1,999))
  })).filter(item=>item.id);
}
function sanitizeQuoteItems(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,100).map(item=>({
    kind:item?.kind==='custom'?'custom':'catalog',
    collection:['equipment','solarPanels','greenProtect'].includes(item?.collection)?item.collection:'equipment',
    productId:cleanText(item?.productId,120),
    productSlug:cleanText(item?.productSlug||item?.productId,160),
    productUrl:/^\/products\/[a-zA-Z0-9_-]+$/.test(String(item?.productUrl||''))?String(item.productUrl):'',
    name:cleanText(item?.name,220),
    description:cleanText(item?.description,700),
    shortDescription:cleanText(item?.shortDescription||item?.description,700),
    image:/^(?:\/|https:\/\/)/.test(String(item?.image||''))?cleanText(item.image,700):'',
    quantity:Math.round(clampNumber(item?.quantity,1,100000)),
    unit:cleanText(item?.unit||'шт.',30),
    unitPrice:clampNumber(item?.unitPrice,0,1_000_000_000),
    discount:clampNumber(item?.discount,0,100),
    total:clampNumber(item?.total??Number(item?.quantity||0)*Number(item?.unitPrice||0),0,1_000_000_000),
    currency:['UAH','USD','EUR'].includes(item?.currency)?item.currency:undefined
  })).filter(item=>item.name);
}
const QUOTE_STATUSES=new Set(['draft','sent','viewed','confirmed','cancelled']);
function normalizedQuoteStatus(value='draft'){return ({accepted:'confirmed',completed:'confirmed',declined:'cancelled'}[value]||value);}
function quoteDefaults(quote={}){return {...quote,status:QUOTE_STATUSES.has(normalizedQuoteStatus(quote.status))?normalizedQuoteStatus(quote.status):'draft',publicToken:quote.publicToken||null,publicEnabled:Boolean(quote.publicEnabled),sentAt:quote.sentAt||null,firstViewedAt:quote.firstViewedAt||null,lastViewedAt:quote.lastViewedAt||null,viewsCount:Number(quote.viewsCount||0),confirmedAt:quote.confirmedAt||null,lastClientActivityAt:quote.lastClientActivityAt||null,adminViewedActivityAt:quote.adminViewedActivityAt||null,previousVersionId:quote.previousVersionId||null,nextVersionId:quote.nextVersionId||null,version:Math.max(1,Number(quote.version||1)),confirmationNotificationSentAt:quote.confirmationNotificationSentAt||null};}
function validProposalToken(value=''){return /^[a-f0-9]{64}$/.test(String(value));}
function publicProposalUrl(token){return `${PUBLIC_SITE_URL}/proposal/${token}`;}
function proposalExpired(quote={}){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(quote.validUntil||'')))return false;return Date.now()>new Date(`${quote.validUntil}T23:59:59`).getTime();}
function serializePublicProposal(source={}){
  const quote=quoteDefaults(source);
  return {
    number:cleanText(quote.number,40),createdAt:quote.createdAt||null,validUntil:quote.validUntil||null,
    expired:proposalExpired(quote),status:quote.status,version:quote.version,
    customer:{name:cleanText(quote.customerName,160),company:cleanText(quote.company,160),phone:cleanText(quote.phone,80),city:cleanText(quote.city,120)},
    items:(quote.items||[]).map(item=>({
      name:cleanText(item.name,220),shortDescription:cleanText(item.shortDescription||item.description,700),
      image:/^(?:\/|https:\/\/)/.test(String(item.image||''))?item.image:'',quantity:Number(item.quantity||0),
      unit:cleanText(item.unit||'шт.',30),unitPrice:Number(item.unitPrice||0),discount:Number(item.discount||0),
      total:Number(item.total??Number(item.quantity||0)*Number(item.unitPrice||0)),
      productUrl:/^\/products\/[a-zA-Z0-9_-]+$/.test(String(item.productUrl||''))?item.productUrl:''
    })),
    subtotal:Number(quote.subtotal||0),currency:['UAH','USD','EUR'].includes(quote.currency)?quote.currency:'UAH',
    note:cleanText(quote.note,3000),paymentTerms:cleanText(quote.paymentTerms||'',1000),deliveryTerms:cleanText(quote.deliveryTerms||'',1000),
    warranty:cleanText(quote.warranty||'',1000),manager:{name:cleanText(quote.createdBy||'Менеджер Voltares',160),phone:'+38 067 672 18 52',email:EMAIL_REPLY_TO},
    confirmedAt:quote.confirmedAt||null
  };
}
function sanitizeAttachments(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,20).map(file=>({url:cleanText(file?.url,500),name:cleanText(file?.name||'Документ',180),type:cleanText(file?.type,100),size:Math.round(clampNumber(file?.size,0,5_000_000))})).filter(file=>/^\/api\/private-media\/[a-zA-Z0-9_-]+$|^\/private-uploads\/[a-zA-Z0-9._-]+$/.test(file.url));
}
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
  const {image,images,description,descriptionEn,translations,audit,viewedAt,purchasePrice,purchaseCurrency,supplier,...summary}=item;
  const normalized=normalizedEquipmentImages(item);
  return {...summary,imageCount:normalized.length,thumbnail:normalized[0]||''};
}
function publicEquipmentDetail(item={}){
  const {image,audit,viewedAt,purchasePrice,purchaseCurrency,supplier,...detail}=item;
  return {...detail,images:normalizedEquipmentImages(item)};
}
function publicCatalogSummary(item={}){
  const {image,audit,viewedAt,purchasePrice,purchaseCurrency,supplier,listPrice,...summary}=item;
  const normalized=[...(Array.isArray(item.images)?item.images:[]),image].filter(Boolean);
  return {...summary,images:normalized,imageCount:normalized.length,thumbnail:normalized[0]||''};
}
function publicCatalogDetail(item={}){
  const {audit,viewedAt,purchasePrice,purchaseCurrency,supplier,listPrice,...detail}=item;
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
  const itemLines=Array.isArray(item.items)?item.items.map(product=>`${product.quantity||1} × ${product.name||product.model||'Товар'}${product.price?` — ${product.price}`:''}`):[];
  const lines={
    leads:['Нова заявка',item.name,item.phone,item.email,item.need||item.object,item.city,...itemLines,item.comment],
    reviews:['Новий відгук',item.name,item.city,item.text],
    questions:['Нове питання',item.author,item.city,item.title,item.body]
  }[type]||['Новий запис',type];
  return lines.filter(Boolean).map(value=>String(value).trim()).filter(Boolean).join('\n');
}

function formatMoney(value,currency='UAH'){
  return new Intl.NumberFormat('uk-UA',{style:'currency',currency:currency==='USD'?'USD':'UAH',maximumFractionDigits:2}).format(Number(value||0));
}
function emailLayout({eyebrow,title,intro='',content,footer=''}){
  return `<!doctype html><html lang="uk"><body style="margin:0;background:#f3f2ec;color:#12201b;font-family:Arial,sans-serif"><div style="max-width:720px;margin:0 auto;padding:28px 16px"><div style="padding:30px;border-radius:22px;background:#0d211b;color:#f8f8ef"><div style="color:#d8ef69;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">${htmlEscape(eyebrow)}</div><h1 style="margin:12px 0 10px;font-size:34px;line-height:1.05">${htmlEscape(title)}</h1>${intro?`<p style="margin:0;color:#b8c7c1;line-height:1.6">${htmlEscape(intro)}</p>`:''}</div><div style="padding:26px 4px">${content}</div><div style="padding:20px 4px;border-top:1px solid #d9ddd8;color:#64716c;font-size:13px;line-height:1.55">${footer||'Voltares / І.Н.К. ТОВ · +38 067 672 18 52 · ink.torg@gmail.com'}</div></div></body></html>`;
}
async function sendEmail({to,subject,html,text,idempotencyKey}){
  if(!RESEND_API_KEY)return {sent:false,error:'EMAIL_NOT_CONFIGURED'};
  if(!validEmail(to))return {sent:false,error:'INVALID_EMAIL'};
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':cleanText(idempotencyKey||crypto.randomUUID(),240)},body:JSON.stringify({from:EMAIL_FROM,to:[String(to).trim()],reply_to:EMAIL_REPLY_TO,subject,html,text})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)return {sent:false,error:cleanText(result.message||`HTTP_${response.status}`,300)};
    return {sent:true,id:cleanText(result.id,160)};
  }catch(error){return {sent:false,error:cleanText(error.message||'EMAIL_ERROR',300)}}finally{clearTimeout(timeout)}
}
function leadEmailContent(item={}){
  const rows=(Array.isArray(item.items)?item.items:[]).map(product=>`<tr><td style="padding:11px;border-bottom:1px solid #e3e5e1"><b>${htmlEscape(product.name||'Товар')}</b><br><small style="color:#77827d">${htmlEscape([product.power,product.phase,product.voltage].filter(Boolean).join(' · '))}</small></td><td style="padding:11px;border-bottom:1px solid #e3e5e1;text-align:center">${htmlEscape(product.quantity||1)}</td><td style="padding:11px;border-bottom:1px solid #e3e5e1;text-align:right">${htmlEscape(product.price||'За запитом')}</td></tr>`).join('');
  const table=rows?`<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden"><thead><tr><th style="padding:11px;text-align:left">Обладнання</th><th style="padding:11px">К-сть</th><th style="padding:11px;text-align:right">Ціна</th></tr></thead><tbody>${rows}</tbody></table>`:'';
  const content=`${table}<div style="margin-top:18px;padding:18px;border-radius:14px;background:#fff"><b>Контактні дані</b><p style="line-height:1.7">${htmlEscape(item.name||'')}<br>${htmlEscape(item.phone||'')}<br>${htmlEscape(item.email||'')}${item.city?`<br>${htmlEscape(item.city)}`:''}</p>${item.comment?`<b>Коментар</b><p style="line-height:1.6">${htmlEscape(item.comment)}</p>`:''}</div>`;
  return emailLayout({eyebrow:'Копія вашого запиту',title:'Комплект обладнання отримано',intro:'Інженер перевірить сумісність позицій і зв’яжеться з вами для уточнення комплектації.',content});
}
async function sendLeadCopy(item={}){
  if(!validEmail(item.email))return {sent:false,error:'EMAIL_NOT_PROVIDED'};
  return sendEmail({to:item.email,subject:`Voltares — копія запиту ${String(item._id||'').slice(-8)}`,html:leadEmailContent(item),text:notificationText('leads',item),idempotencyKey:`lead-${item._id}`});
}
function quoteEmailContent(quote={}){
  const currency=quote.currency||'UAH';
  const createdDate=new Date(quote.createdAt||Date.now());
  const reservedDate=new Date(`${quote.validUntil||''}T12:00:00`);
  const validDays=Number.isNaN(reservedDate.getTime())?3:Math.max(1,Math.round((reservedDate.getTime()-createdDate.getTime())/86_400_000));
  const validDate=String(quote.validUntil||'').split('-').reverse().join('.');
  const rows=(quote.items||[]).map(item=>`<tr><td style="padding:11px;border-bottom:1px solid #e3e5e1"><b>${htmlEscape(item.name)}</b>${item.description?`<br><small style="color:#77827d">${htmlEscape(item.description)}</small>`:''}</td><td style="padding:11px;border-bottom:1px solid #e3e5e1;text-align:center">${htmlEscape(item.quantity)} ${htmlEscape(item.unit)}</td><td style="padding:11px;border-bottom:1px solid #e3e5e1;text-align:right">${htmlEscape(formatMoney(item.unitPrice,currency))}</td><td style="padding:11px;border-bottom:1px solid #e3e5e1;text-align:right"><b>${htmlEscape(formatMoney(Number(item.quantity)*Number(item.unitPrice),currency))}</b></td></tr>`).join('');
  const publicLink=quote.publicEnabled&&quote.publicToken?`<p style="margin:20px 0"><a href="${htmlEscape(publicProposalUrl(quote.publicToken))}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#e88b22;color:#fff;text-decoration:none;font-weight:800">Переглянути та підтвердити пропозицію</a></p>`:'';
  const content=`<p style="font-size:16px;line-height:1.6">Для: <b>${htmlEscape(quote.customerName||quote.company||'Клієнт')}</b>${quote.company?` · ${htmlEscape(quote.company)}`:''}</p>${publicLink}<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden"><thead><tr><th style="padding:11px;text-align:left">Позиція</th><th style="padding:11px">К-сть</th><th style="padding:11px;text-align:right">Ціна</th><th style="padding:11px;text-align:right">Сума</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="padding:16px;text-align:right"><b>Разом</b></td><td style="padding:16px;text-align:right;font-size:19px"><b>${htmlEscape(formatMoney(quote.subtotal,currency))}</b></td></tr></tfoot></table>${quote.note?`<div style="margin-top:18px;padding:18px;border-radius:14px;background:#fff"><b>Примітка</b><p style="line-height:1.6">${htmlEscape(quote.note)}</p></div>`:''}`;
  return emailLayout({eyebrow:`Комерційна пропозиція ${quote.number||''}`,title:'Комплектація та вартість',intro:quote.validUntil?`Ціна та наявність зарезервовані на ${validDays} дн., до ${validDate} включно.`:'',content});
}
async function sendProposalConfirmationNotification(quote={}){
  const confirmed=new Date(quote.confirmedAt||Date.now()).toLocaleString('uk-UA',{timeZone:'Europe/Warsaw',dateStyle:'medium',timeStyle:'short'});
  const adminUrl=`${PUBLIC_SITE_URL}/admin.html#quotes`;
  const title=`Клієнт підтвердив комерційну пропозицію ${quote.number||''}`.trim();
  const text=[`Клієнт ${quote.customerName||quote.company||'—'} підтвердив комерційну пропозицію ${quote.number||''}.`,`Дата підтвердження: ${confirmed}`,`Сума: ${formatMoney(quote.subtotal,quote.currency)}`,`Відкрити в адмінці: ${adminUrl}`].join('\n');
  const content=`<div style="padding:20px;border-radius:14px;background:#fff"><p><b>${htmlEscape(quote.customerName||quote.company||'Клієнт')}</b> підтвердив пропозицію.</p><p>Дата: ${htmlEscape(confirmed)}<br>Сума: <b>${htmlEscape(formatMoney(quote.subtotal,quote.currency))}</b></p><p><a href="${htmlEscape(adminUrl)}">Відкрити в адмінці →</a></p></div>`;
  return sendEmail({to:EMAIL_REPLY_TO,subject:title,html:emailLayout({eyebrow:'Нова дія клієнта',title,content}),text,idempotencyKey:`proposal-confirmed-${quote._id}`});
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
  if(url.pathname==='/api/integrations/status'){ if(!await requireAdmin(req,res))return; const contact=await getContactApiStatus(); return json(res,200,{contactApi:contact.available,contactApiConfigured:contact.configured,notifications:contact.available,email: Boolean(RESEND_API_KEY&&EMAIL_FROM),route:contact.route}); }
  if(url.pathname==='/api/dashboard'){ const user=await requireAdmin(req,res);if(!user)return;const result={};for(const type of COLLECTIONS){let items=await store.list(type);if(type==='quotes')items=items.filter(item=>canAccessQuote(user,item));const hasUnread=['leads','reviews','questions'].includes(type);result[type]={total:items.length,unread:hasUnread?items.filter(x=>!x.viewedAt).length:0};}return json(res,200,result); }
  if(url.pathname==='/api/admin/mark-viewed'&&req.method==='POST'){ if(!await requireAdmin(req,res))return; const input=await body(req); if(!COLLECTIONS.has(input.type))return json(res,400,{error:'INVALID_TYPE'}); await store.markViewed(input.type); return json(res,200,{ok:true}); }
  const mediaMatch=url.pathname.match(/^\/api\/media\/([a-zA-Z0-9_-]+)$/);
  if(mediaMatch&&req.method==='GET'){
    if(typeof store.getMedia!=='function')return json(res,404,{error:'NOT_FOUND'});
    const media=await store.getMedia(mediaMatch[1]);
    if(!media||media.access==='private')return json(res,404,{error:'NOT_FOUND'});
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
  const privateMediaMatch=url.pathname.match(/^\/api\/private-media\/([a-zA-Z0-9_-]+)$/);
  if(privateMediaMatch&&req.method==='GET'){
    if(!await requireAdmin(req,res))return;
    if(typeof store.getMedia!=='function')return json(res,404,{error:'NOT_FOUND'});
    const media=await store.getMedia(privateMediaMatch[1]);if(!media||media.access!=='private')return json(res,404,{error:'NOT_FOUND'});
    const binary=media.data;const bytes=Buffer.isBuffer(binary)?binary:binary?.buffer?Buffer.from(binary.buffer).subarray(0,Number(binary.position)||binary.buffer.length):Buffer.from(binary||[]);
    securityHeaders(res);res.writeHead(200,{'Content-Type':media.contentType||'application/octet-stream','Content-Length':String(bytes.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'});return res.end(bytes);
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
  if(url.pathname==='/api/attachments'&&req.method==='POST'){
    if(!await requireAdmin(req,res))return;
    const input=await body(req,6_000_000);
    const match=String(input.dataUrl||'').match(/^data:(application\/pdf|image\/(?:png|jpeg|webp)|text\/plain|text\/csv|application\/(?:vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-excel));base64,(.+)$/);
    if(!match)return json(res,400,{error:'INVALID_ATTACHMENT'});
    const contentType=match[1];const bytes=Buffer.from(match[2],'base64');
    if(!bytes.length||bytes.length>4_000_000)return json(res,400,{error:'INVALID_ATTACHMENT_SIZE'});
    if(process.env.VERCEL){if(typeof store.saveMedia!=='function')return json(res,503,{error:'MEDIA_STORE_UNAVAILABLE'});const id=await store.saveMedia(bytes,contentType,'private');return json(res,201,{url:`/api/private-media/${id}`});}
    const extension={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp','text/plain':'txt','text/csv':'csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-excel':'xls'}[contentType]||'bin';
    const filename=`${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;await fs.mkdir(path.join(ROOT,'private-uploads'),{recursive:true});await fs.writeFile(path.join(ROOT,'private-uploads',filename),bytes);return json(res,201,{url:`/private-uploads/${filename}`});
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
  const publicProposalMatch=url.pathname.match(/^\/api\/public\/proposals\/([^/]+)(?:\/(view|confirm))?$/);
  if(publicProposalMatch){
    const token=publicProposalMatch[1];const action=publicProposalMatch[2]||'get';
    if(!validProposalToken(token))return json(res,400,{error:'INVALID_LINK'});
    if(!allowRequest(req,res,`public-proposal-${action}`,action==='get'?60:20,10*60_000))return;
    const quote=await store.quoteByToken(token);
    if(!quote)return json(res,404,{error:'NOT_FOUND'});
    if(!quote.publicEnabled)return json(res,410,{error:'LINK_REVOKED'});
    const employeeViewer=Boolean(await activeSessionUser(req));
    if(action==='get'&&req.method==='GET')return json(res,200,{...serializePublicProposal(quote),employeeViewer},{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});
    if(action==='view'&&req.method==='POST'){
      if(employeeViewer)return json(res,200,{ok:true,status:normalizedQuoteStatus(quote.status),employeeViewer:true});
      const viewed=await store.recordQuoteView(token,new Date().toISOString());
      return viewed?json(res,200,{ok:true,status:normalizedQuoteStatus(viewed.status)}):json(res,410,{error:'LINK_REVOKED'});
    }
    if(action==='confirm'&&req.method==='POST'){
      if(employeeViewer)return json(res,409,{error:'EMPLOYEE_PREVIEW_ONLY'});
      if(proposalExpired(quote))return json(res,409,{error:'PROPOSAL_EXPIRED'});
      const result=await store.confirmQuote(token,new Date().toISOString());
      if(!result.quote)return json(res,404,{error:'NOT_FOUND'});
      if(!result.quote.publicEnabled)return json(res,410,{error:'LINK_REVOKED'});
      if(!result.changed){
        if(normalizedQuoteStatus(result.quote.status)==='confirmed')return json(res,200,{ok:true,alreadyConfirmed:true,confirmedAt:result.quote.confirmedAt||null});
        return json(res,409,{error:'CONFIRMATION_NOT_ALLOWED'});
      }
      try{
        const delivery=await sendProposalConfirmationNotification(result.quote);
        if(delivery.sent)await store.update('quotes',result.quote._id,{confirmationNotificationSentAt:new Date().toISOString()});
        else console.error('Proposal confirmation email failed',{proposalId:result.quote._id,number:result.quote.number,error:delivery.error,at:new Date().toISOString()});
      }catch(error){console.error('Proposal confirmation notification error',{proposalId:result.quote._id,number:result.quote.number,error:error.message,at:new Date().toISOString()});}
      return json(res,200,{ok:true,confirmedAt:result.quote.confirmedAt});
    }
    return json(res,405,{error:'METHOD_NOT_ALLOWED'});
  }
  const adminProposalMatch=url.pathname.match(/^\/api\/admin\/proposals\/([^/]+)\/(publish|revoke|create-version|mark-activity-seen)$/);
  if(adminProposalMatch&&req.method==='POST'){
    const user=await requireAdmin(req,res);if(!user)return;
    const [,id,action]=adminProposalMatch;
    const quote=(await store.list('quotes')).find(item=>String(item._id)===id);
    if(!quote)return json(res,404,{error:'NOT_FOUND'});
    if(!canAccessQuote(user,quote))return json(res,403,{error:'QUOTE_ACCESS_DENIED'});
    if(action==='publish'){
      if(!cleanText(quote.customerName,160)||!cleanText(quote.phone,80)||!Array.isArray(quote.items)||!quote.items.length)return json(res,400,{error:'QUOTE_PUBLISH_FIELDS_REQUIRED'});
      if(normalizedQuoteStatus(quote.status)==='cancelled')return json(res,409,{error:'CANCELLED_PROPOSAL'});
      let token=quote.publicEnabled&&validProposalToken(quote.publicToken)?quote.publicToken:'';
      if(!token){do{token=crypto.randomBytes(32).toString('hex');}while(await store.quoteByToken(token));}
      const now=new Date().toISOString();const items=await hydrateQuoteItemSnapshots(quote.items,quote.currency||'UAH');const subtotal=items.reduce((sum,item)=>sum+Number(item.total),0);
      const status=normalizedQuoteStatus(quote.status)==='confirmed'?'confirmed':'sent';
      const updated=await store.update('quotes',id,{publicToken:token,publicEnabled:true,status,sentAt:quote.sentAt||now,items,subtotal,ownerId:quote.ownerId||user.id,createdBy:quote.createdBy||user.name});
      return json(res,200,{proposal:updated,publicUrl:publicProposalUrl(token)});
    }
    if(action==='revoke')return json(res,200,await store.update('quotes',id,{publicEnabled:false}));
    if(action==='mark-activity-seen')return json(res,200,await store.update('quotes',id,{adminViewedActivityAt:new Date().toISOString()}));
    if(action==='create-version'){
      if(normalizedQuoteStatus(quote.status)!=='confirmed')return json(res,409,{error:'ONLY_CONFIRMED_CAN_VERSION'});
      const version=Math.max(1,Number(quote.version||1))+1;
      const copyFields=['customerName','company','email','phone','city','validUntil','note','items','currency','subtotal','sharedWith','sourceLeadId','ownerId','createdBy'];
      const copy=Object.fromEntries(copyFields.filter(key=>quote[key]!==undefined).map(key=>[key,structuredClone(quote[key])]));
      const created=await store.create('quotes',{...copy,number:`KP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,status:'draft',publicEnabled:false,sentAt:null,firstViewedAt:null,lastViewedAt:null,viewsCount:0,confirmedAt:null,lastClientActivityAt:null,adminViewedActivityAt:null,previousVersionId:String(quote._id),nextVersionId:null,version,confirmationNotificationSentAt:null,emailStatus:'not-sent',emailId:'',emailError:''});
      await store.update('quotes',quote._id,{nextVersionId:String(created._id)});
      return json(res,201,created);
    }
  }
  const quoteSendMatch=url.pathname.match(/^\/api\/quotes\/([^/]+)\/send$/);
  if(quoteSendMatch&&req.method==='POST'){
    const user=await requireAdmin(req,res);if(!user)return;
    const quote=(await store.list('quotes')).find(item=>String(item._id)===quoteSendMatch[1]);
    if(!quote)return json(res,404,{error:'NOT_FOUND'});
    if(!canAccessQuote(user,quote))return json(res,403,{error:'QUOTE_ACCESS_DENIED'});
    if(!cleanText(quote.customerName,160)||!cleanText(quote.phone,80)||!validEmail(quote.email)||!Array.isArray(quote.items)||!quote.items.length)return json(res,400,{error:'QUOTE_SEND_FIELDS_REQUIRED'});
    if(['confirmed','cancelled'].includes(normalizedQuoteStatus(quote.status)))return json(res,409,{error:normalizedQuoteStatus(quote.status)==='confirmed'?'CONFIRMED_READ_ONLY':'CANCELLED_PROPOSAL'});
    let token=quote.publicEnabled&&validProposalToken(quote.publicToken)?quote.publicToken:'';
    if(!token){do{token=crypto.randomBytes(32).toString('hex');}while(await store.quoteByToken(token));}
    const now=new Date().toISOString();const items=await hydrateQuoteItemSnapshots(quote.items,quote.currency||'UAH');const subtotal=items.reduce((sum,item)=>sum+Number(item.total),0);
    const published=await store.update('quotes',quote._id,{status:'sent',publicToken:token,publicEnabled:true,sentAt:quote.sentAt||now,items,subtotal,ownerId:quote.ownerId||user.id,createdBy:quote.createdBy||user.name});
    const delivery=await sendEmail({to:published.email,subject:`Комерційна пропозиція Voltares ${published.number||''}`.trim(),html:quoteEmailContent(published),text:`Комерційна пропозиція ${published.number||''}\nРазом: ${formatMoney(published.subtotal,published.currency)}\n${publicProposalUrl(token)}`,idempotencyKey:`quote-${published._id}-${published.updatedAt||published.createdAt}`});
    const updated=await store.update('quotes',published._id,{emailStatus:delivery.sent?'sent':'failed',emailId:delivery.id||'',emailError:delivery.error||''});
    return json(res,200,{...updated,publicUrl:publicProposalUrl(token),emailDelivered:delivery.sent});
  }
  if(url.pathname==='/api/leads/bulk-delete'&&req.method==='POST'){
    if(!await requireAdmin(req,res))return;
    const input=await body(req);
    const ids=[...new Set((Array.isArray(input.ids)?input.ids:[]).map(id=>String(id||'').trim()).filter(id=>/^[a-zA-Z0-9_-]{1,100}$/.test(id)))].slice(0,200);
    if(!ids.length)return json(res,400,{error:'IDS_REQUIRED'});
    let deleted=0;
    for(const id of ids)if(await store.remove('leads',id))deleted+=1;
    return json(res,200,{ok:true,deleted,requested:ids.length});
  }
  const match=url.pathname.match(/^\/api\/(leads|reviews|questions|faqs|projects|articles|equipment|solarPanels|greenProtect|quotes|purchases)(?:\/([^/]+))?$/); if(!match)return false;
  const [,type,id]=match; const adminUser=await activeSessionUser(req); const isAdmin=Boolean(adminUser);
  if(req.method==='GET'){
    if(['leads','quotes','purchases'].includes(type)&&!isAdmin)return json(res,401,{error:'AUTH_REQUIRED'});
    let items=await store.list(type);
    if(type==='quotes'&&isAdmin)items=items.filter(item=>canAccessQuote(adminUser,item)).map(quoteDefaults);
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
    if(id&&!items.some(x=>String(x._id)===id))return json(res,404,{error:'NOT_FOUND'});
    const result=id?(items.find(x=>String(x._id)===id)||null):items;
    // Project publication changes must be visible immediately. A previously
    // published project that becomes a draft must never survive in a CDN or
    // browser cache, so this collection deliberately uses `no-store`.
    return isAdmin||type==='projects'?json(res,200,result):publicJson(req,res,result);
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
    if(type==='leads'){
      input.attribution=sanitizeAttribution(input.attribution);
      const requested=sanitizeLeadItems(input.items);const verified=[];
      for(const requestItem of requested){const product=(await store.list(requestItem.collection)).find(item=>String(item._id)===requestItem.id&&item.status==='active');if(!product)continue;verified.push({collection:requestItem.collection,id:String(product._id),name:`${product.brand||''} ${product.model||product.name||''}`.trim(),power:cleanText(product.power||product.spec,100),phase:cleanText(product.phase||product.technology||product.category,100),voltage:cleanText(product.voltage,100),price:cleanText(product.price||'За запитом',100),priceUsd:clampNumber(product.priceUsd,0,10_000_000),quantity:requestItem.quantity});}
      input.items=verified;
      if(verified.length&&input.email&&!validEmail(input.email))return json(res,400,{error:'INVALID_EMAIL_FOR_CART'});
    }
    if(type==='quotes'){
      input.currency=input.currency==='USD'?'USD':'UAH';input.items=await hydrateQuoteItemSnapshots(input.items,input.currency);input.subtotal=input.items.reduce((sum,item)=>sum+Number(item.total),0);input.status='draft';input.ownerId=String(adminUser?.id||'');input.createdBy=adminUser?.name||'';input.sharedWith=await sanitizeQuoteShares(input.sharedWith,input.ownerId);input.sourceLeadId=cleanText(input.sourceLeadId,100);input.number=cleanText(input.number||`KP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,40);Object.assign(input,{publicEnabled:false,sentAt:null,firstViewedAt:null,lastViewedAt:null,viewsCount:0,confirmedAt:null,lastClientActivityAt:null,adminViewedActivityAt:null,previousVersionId:null,nextVersionId:null,version:1,confirmationNotificationSentAt:null,emailStatus:'not-sent',emailId:'',emailError:''});
    }
    if(type==='purchases'){input.attachments=sanitizeAttachments(input.attachments);input.status=['planned','ordered','received','cancelled'].includes(input.status)?input.status:'planned';input.currency=['UAH','USD','EUR'].includes(input.currency)?input.currency:'UAH';input.amount=clampNumber(input.amount,0,1_000_000_000);input.createdBy=adminUser?.name||'';}
    if(type==='equipment'){
      input.homeMode=['auto','featured','hidden'].includes(input.homeMode)?input.homeMode:'auto';
      input.homeOrder=Math.max(0,Number(input.homeOrder||0));
      input.views=0;
    }
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
    const requiredOk = type==='leads' ? input.name && input.phone : type==='reviews' ? input.name && input.text : type==='questions' ? input.title : type==='faqs' ? input.question && input.answer : ['equipment','solarPanels'].includes(type) ? input.brand && input.model : type==='greenProtect' ? input.code && input.model : type==='quotes' ? true : type==='purchases' ? input.supplier : input.title;
    if(!requiredOk)return json(res,400,{error:'REQUIRED_FIELDS'});
    const created=await store.create(type,input);
    await sendContactNotification(type,created);
    if(type==='leads'&&created.email){const delivery=await sendLeadCopy(created);const updated=await store.update('leads',created._id,{emailCopySent:delivery.sent,emailCopyId:delivery.id||'',emailCopyError:delivery.error||''});return json(res,201,updated);}
    return json(res,201,created);
  }
  if(['PATCH','DELETE'].includes(req.method)){
    const user=await requireAdmin(req,res);if(!user)return;
    if(!id)return json(res,400,{error:'ID_REQUIRED'});
    const previous=(await store.list(type)).find(item=>String(item._id)===id);
    if(!previous)return json(res,404,{error:'NOT_FOUND'});
    if(type==='quotes'&&!canAccessQuote(user,previous))return json(res,403,{error:'QUOTE_ACCESS_DENIED'});
    if(req.method==='DELETE'){
      if(type==='quotes'&&!isQuoteOwner(user,previous))return json(res,403,{error:'QUOTE_OWNER_ONLY'});
      if(type==='quotes'&&normalizedQuoteStatus(previous.status)==='confirmed')return json(res,409,{error:'CONFIRMED_READ_ONLY'});
      return json(res,(await store.remove(type,id))?200:404,{ok:true});
    }
    const input=sanitize(type,await body(req));
    if(type==='equipment'){
      if(input.homeMode!==undefined)input.homeMode=['auto','featured','hidden'].includes(input.homeMode)?input.homeMode:'auto';
      if(input.homeOrder!==undefined)input.homeOrder=Math.max(0,Number(input.homeOrder||0));
    }
    if(type==='quotes'){
      if(normalizedQuoteStatus(previous.status)==='confirmed')return json(res,409,{error:'CONFIRMED_READ_ONLY'});
      if(!previous.ownerId&&isQuoteOwner(user,previous))input.ownerId=String(user.id||'');
      if(input.items!==undefined){input.items=await hydrateQuoteItemSnapshots(input.items,input.currency||previous.currency||'UAH');input.subtotal=input.items.reduce((sum,item)=>sum+Number(item.total),0)}
      if(input.currency!==undefined)input.currency=input.currency==='USD'?'USD':'UAH';
      if(input.status!==undefined){
        const from=normalizedQuoteStatus(previous.status);const to=normalizedQuoteStatus(input.status);const transitions={draft:['draft','sent','cancelled'],sent:['sent','viewed','confirmed','cancelled'],viewed:['viewed','confirmed','cancelled'],cancelled:['cancelled']}[from]||[from];
        if(!transitions.includes(to)){
          const rank={draft:0,sent:1,viewed:2,confirmed:3,cancelled:4};
          if(Number(rank[to])<Number(rank[from]))delete input.status;
          else return json(res,409,{error:'INVALID_STATUS_TRANSITION'});
        }else{input.status=to;if(to==='cancelled')input.publicEnabled=false;}
      }
      if(input.sourceLeadId!==undefined)input.sourceLeadId=cleanText(input.sourceLeadId,100);
      if(input.sharedWith!==undefined){
        if(!isQuoteOwner(user,previous))return json(res,403,{error:'QUOTE_OWNER_ONLY'});
        input.sharedWith=await sanitizeQuoteShares(input.sharedWith,previous.ownerId||user.id);
      }
    }
    if(type==='purchases'){
      if(input.attachments!==undefined)input.attachments=sanitizeAttachments(input.attachments);
      if(input.amount!==undefined)input.amount=clampNumber(input.amount,0,1_000_000_000);
    }
    if(type==='reviews'){
      if(input.verified!==undefined){input.verified=Boolean(input.verified);input.verifiedAt=input.verified?new Date().toISOString():null;input.verifiedBy=input.verified?user.name:'';}
      const next={...previous,...input};input.audit=reviewAudit(previous,next,user);
    }
    return json(res,200,await store.update(type,id,input));
  }
  return json(res,405,{error:'METHOD_NOT_ALLOWED'});
}

async function serve(req,res,url){
  if(url.pathname==='/admin.html'&&!currentUser(req)){res.writeHead(302,{Location:'/admin-login.html'});return res.end();}
  if(/^\/proposal\/[^/]+\/?$/.test(url.pathname)){
    const page=await fs.readFile(path.join(ROOT,'proposal.html'));
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'});return res.end(page);
  }
  if(url.pathname.startsWith('/private-uploads/')){
    if(!await requireAdmin(req,res))return;
    const file=path.resolve(ROOT,`.${decodeURIComponent(url.pathname)}`);const directory=path.join(ROOT,'private-uploads');
    if(!file.startsWith(directory+path.sep))return json(res,403,{error:'FORBIDDEN'});
    try{const data=await fs.readFile(file);securityHeaders(res);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'private, no-store','Content-Disposition':'inline'});return res.end(data);}catch{return json(res,404,{error:'NOT_FOUND'});}
  }
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
    const xml=await fs.readFile(path.join(ROOT,'sitemap.xml'));
    res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Content-Length':String(xml.length),'Cache-Control':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'});
    return res.end(xml);
  }
  const categoryMatch=url.pathname.match(/^\/categories\/([a-z-]+)\/?$/);
  if(categoryMatch){
    if(url.pathname.endsWith('/')){res.writeHead(301,{Location:url.pathname.slice(0,-1)});return res.end()}
    const category=SEO_CATEGORIES[categoryMatch[1]];
    if(!category)return json(res,404,{error:'NOT_FOUND'});
    const items=(await Promise.all(category.collections.map(type=>store.list(type)))).flat().filter(item=>item.status==='active'&&category.match(item));
    const canonical=`${PUBLIC_SITE_URL}/categories/${categoryMatch[1]}`;
    const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Головна',item:`${PUBLIC_SITE_URL}/`},{'@type':'ListItem',position:2,name:'Каталог',item:`${PUBLIC_SITE_URL}/catalog.html`},{'@type':'ListItem',position:3,name:category.name,item:canonical}]};
    const collection={'@context':'https://schema.org','@type':'CollectionPage',name:category.name,description:category.description,url:canonical,inLanguage:'uk-UA',mainEntity:{'@type':'ItemList',numberOfItems:items.length,itemListElement:items.map((item,index)=>({'@type':'ListItem',position:index+1,url:`${PUBLIC_SITE_URL}${equipmentUrl(item)}`,name:`${item.brand||''} ${item.model||''}`.trim()}))}};
    const cards=items.map(item=>{const image=absoluteUrl(normalizedEquipmentImages(item)[0]||'/og-voltera.svg');const usd=Number(item.priceUsd||0)>0?`$${Math.round(Number(item.priceUsd)).toLocaleString('en-US')}`:'';const price=[item.price||'Ціна за запитом',usd].filter(Boolean).join(' · ');return`<a class="category-card" href="${equipmentUrl(item)}"><span class="category-card-media"><img src="${htmlEscape(image)}" alt="${htmlEscape(`${item.brand||''} ${item.model||''}`.trim())}" loading="lazy" width="520" height="520"></span><span class="category-card-copy"><small>${htmlEscape(item.brand||'Voltares')}</small><h2>${htmlEscape(item.model||'')}</h2><p>${htmlEscape([item.power||item.spec,item.phase||item.technology||item.category,item.voltage].filter(Boolean).join(' · '))}</p><span class="category-card-bottom"><strong>${htmlEscape(price)}</strong><b>Детальніше ↗</b></span></span></a>`}).join('');
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(category.title)}</title><meta name="description" content="${htmlEscape(category.description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="uk-UA" href="${canonical}"><link rel="alternate" hreflang="x-default" href="${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="Voltares"><meta property="og:title" content="${htmlEscape(category.title)}"><meta property="og:description" content="${htmlEscape(category.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${PUBLIC_SITE_URL}/og-voltera.svg"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/content-pages.css?v=20260719-2"><link rel="stylesheet" href="/category-page.css?v=20260721-2"><script type="application/ld+json">${jsonLd(collection)}</script><script type="application/ld+json">${jsonLd(breadcrumb)}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="Voltares — головна"></a><nav class="page-nav"><a href="/catalog.html">Каталог</a><a href="/faq.html">FAQ</a><a href="/calculators.html">Калькулятори</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><nav class="breadcrumbs page-container" aria-label="Хлібні крихти"><a href="/">Головна</a><span>›</span><a href="/catalog.html">Каталог</a><span>›</span><span aria-current="page">${htmlEscape(category.name)}</span></nav><section class="category-hero page-container"><p class="page-eyebrow">Категорія обладнання</p><h1>${htmlEscape(category.name)}</h1><p class="page-lead">${htmlEscape(category.intro)}</p></section><section class="category-products page-container" aria-label="Товари категорії">${cards||'<p>Перевірені моделі готуються до публікації.</p>'}</section><section class="category-guide page-container"><h2>Як підготуватися до вибору</h2><p>Запишіть постійне й пікове навантаження, бажаний час автономності, кількість фаз і дані ввідного щита. Інженер перевірить сумісність компонентів та захист.</p><div><a href="/calculators.html">Розрахувати автономність</a><a href="/faq.html">Відповіді на питання</a><a href="/rishennia/invertor-dlia-domu.html">Рішення для дому</a><a href="/rishennia/soniachni-paneli.html">Гібридна СЕС</a></div></section></main><footer class="page-footer"><div class="page-container">© 2026 Voltares / ІНК</div></footer></body></html>`;
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
    const image=images[0]||'https://www.voltares.pp.ua/og-voltera.svg';
    const description=String(item.description||`${name} для систем резервного та автономного живлення.`).split(/\n/)[0].slice(0,240);
    const amount=priceAmount(item.price);
    const specs=[['Потужність / ємність',item.power],['Фази / тип',item.phase],['Робоча напруга',item.voltage],['Бренд',item.brand]].filter(([,value])=>value);
    const productSchema=amount?{'@context':'https://schema.org','@type':'Product','@id':`${canonical}#product`,name,description,image,sku:String(item._id),brand:{'@type':'Brand',name:item.brand||'Voltares'},url:canonical,offers:{'@type':'Offer',url:canonical,priceCurrency:'UAH',price:amount,availability:'https://schema.org/InStock',itemCondition:'https://schema.org/NewCondition',seller:{'@id':`${PUBLIC_SITE_URL}/#organization`}}}:null;
    const breadcrumbSchema={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Головна',item:'https://www.voltares.pp.ua/'},{'@type':'ListItem',position:2,name:'Каталог',item:'https://www.voltares.pp.ua/catalog.html'},{'@type':'ListItem',position:3,name:item.brand||'Обладнання',item:`https://www.voltares.pp.ua/obladnannia/${String(item.brand||'').toLowerCase()}.html`},{'@type':'ListItem',position:4,name,item:canonical}]};
    const body=String(item.description||'').split(/\n{2,}/).filter(Boolean).map(block=>/^#{2,3}\s/.test(block)?`<h2>${htmlEscape(block.replace(/^#{2,3}\s+/,''))}</h2>`:/^(?:[-•]\s.+\n?)+$/m.test(block)?`<ul>${block.split(/\n/).filter(Boolean).map(line=>`<li>${htmlEscape(line.replace(/^[-•]\s+/,''))}</li>`).join('')}</ul>`:`<p>${htmlEscape(block).replace(/\n/g,'<br>')}</p>`).join('');
    const related=equipment.filter(product=>String(product._id)!==String(item._id)&&String(product.brand||'').toLowerCase()===String(item.brand||'').toLowerCase()).slice(0,3);
    const relatedMarkup=related.map(product=>`<a href="${equipmentUrl(product)}" data-related-product="${htmlEscape(String(product._id))}">${htmlEscape(`${product.brand||''} ${product.model||''}`.trim())}</a>`).join('');
    const productSchemaMarkup=productSchema?`<script type="application/ld+json">${jsonLd(productSchema)}</script>`:'';
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(name)} — ціна та характеристики | Voltares</title><meta name="description" content="${htmlEscape(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="uk-UA" href="${canonical}"><link rel="alternate" hreflang="x-default" href="${canonical}"><meta property="og:type" content="product"><meta property="og:locale" content="uk_UA"><meta property="og:site_name" content="Voltares"><meta property="og:title" content="${htmlEscape(name)} — ціна та характеристики"><meta property="og:description" content="${htmlEscape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${htmlEscape(image)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/content-pages.css?v=20260719-2"><link rel="stylesheet" href="/product-page.css?v=20260719-1">${productSchemaMarkup}<script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="Voltares — головна"></a><nav class="page-nav"><a href="/catalog.html">Каталог</a><a href="/faq.html">FAQ</a><a href="/calculators.html">Калькулятори</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><nav class="breadcrumbs page-container" aria-label="Хлібні крихти"><a href="/">Головна</a><span>›</span><a href="/catalog.html">Каталог</a><span>›</span><a href="/obladnannia/${htmlEscape(String(item.brand||'').toLowerCase())}.html">${htmlEscape(item.brand||'Обладнання')}</a><span>›</span><span aria-current="page">${htmlEscape(item.model||'')}</span></nav><section class="product-hero page-container"><div class="product-media"><img src="${htmlEscape(image)}" alt="${htmlEscape(name)}" width="800" height="800" fetchpriority="high"></div><div class="product-summary"><p class="page-eyebrow">${htmlEscape(item.brand||'Обладнання')} · резервне живлення</p><h1>${htmlEscape(name)}</h1><p class="page-lead">${htmlEscape(description)}</p><strong class="product-price">${htmlEscape(item.price||'Ціна за запитом')}</strong><div class="product-actions"><a class="page-button" href="/#consultation">Підібрати систему →</a><a href="/calculators.html">Розрахувати автономність</a></div></div></section><section class="page-container product-layout"><article class="article-content"><h2>Опис і переваги</h2>${body}<h2>Для кого ця модель</h2><p>${htmlEscape(name)} підходить для проєктів резервного, автономного або сонячного живлення, якщо його параметри відповідають навантаженню, батареї та схемі підключення. Остаточну сумісність має перевірити інженер.</p><h2>Що перевірити перед замовленням</h2><ul><li>пікову й постійну потужність споживачів;</li><li>тип мережі та кількість фаз;</li><li>напругу, BMS і корисну ємність акумулятора;</li><li>умови монтажу, захист і переріз кабелів;</li><li>необхідний час автономної роботи.</li></ul></article><aside class="product-specs"><h2>Характеристики</h2><dl>${specs.map(([label,value])=>`<div><dt>${htmlEscape(label)}</dt><dd>${htmlEscape(value)}</dd></div>`).join('')}</dl><p>Характеристики уточнюються перед комплектацією проєкту.</p></aside></section><section class="page-container related-block"><h2>Корисно перед вибором</h2><div><a href="/rishennia/invertor-dlia-domu.html">Як вибрати інвертор для дому</a><a href="/obladnannia/lifepo4.html">LiFePO₄ акумулятори</a><a href="/calculators.html">Калькулятор автономності</a><a href="/faq.html">Відповіді на часті питання</a><a href="/articles/5-pryladiv-iaki-zidaiut-avtonomnist.html">Що зменшує автономність</a></div></section></main><footer class="page-footer"><div class="page-container">© 2026 Voltares / ІНК · Енергетичні рішення</div></footer></body></html>`;
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
    const page=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(article.title)} | ІНК</title><meta name="description" content="${htmlEscape(article.excerpt||article.title)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://www.voltares.pp.ua/articles/${encodeURIComponent(slug)}.html"><link rel="stylesheet" href="/content-pages.css?v=20260718-1"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:article.title,description:article.excerpt||'',image:images,datePublished:article.createdAt,dateModified:article.updatedAt,author:{'@type':'Organization',name:'ІНК'},publisher:{'@type':'Organization',name:'ІНК',logo:{'@type':'ImageObject',url:'https://www.voltares.pp.ua/assets/brand/ink-logo-transparent.png'}}}).replace(/</g,'\\u003c')}</script></head><body><header class="page-header"><div class="page-container"><a class="page-logo" href="/" aria-label="ІНК — головна"></a><nav class="page-nav"><a href="/#journal">Журнал</a><a href="/gallery.html">Галерея</a><a href="/#contacts">Контакти</a></nav><a class="page-button" href="/#consultation">Консультація</a></div></header><main><section class="page-hero"><div class="page-container"><p class="page-eyebrow">${htmlEscape(article.category||'Журнал')}</p><h1>${htmlEscape(article.title)}</h1><p class="page-lead">${htmlEscape(article.excerpt||'')}</p></div></section><div class="page-container article-layout"><aside class="article-aside"><a href="/">← На головну</a><a href="/#journal">Інші статті</a></aside><article class="article-content">${images.map(src=>`<img src="${htmlEscape(src)}" alt="${htmlEscape(article.title)}" loading="lazy" style="width:100%;margin:0 0 24px;border-radius:22px">`).join('')}${paragraphs}<a class="page-button" href="/#consultation">Поставити питання →</a></article></div></main><footer class="page-footer"><div class="page-container">© 2026 ІНК · Енергетичні рішення</div></footer></body></html>`;
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
    if(requestHost.endsWith('.vercel.app')||/^\/(?:admin|api|private|preview|draft|proposal)(?:[/.]|$)/.test(url.pathname))res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
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
    json(res,status,{error:String(req.url||'').startsWith('/api/public/proposals/')?'SERVER_ERROR':error.message||'SERVER_ERROR'});
  }
}
export default handleRequest;

if(!process.env.VERCEL && process.argv[1]===fileURLToPath(import.meta.url)){
  const server=http.createServer(handleRequest);
  server.listen(PORT,()=>console.log(`INK Energy: http://127.0.0.1:${PORT}`));
}
