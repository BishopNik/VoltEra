const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const CART_KEY = 'voltares-catalog-cart-v1';
const CATALOG_CACHE_KEY = 'voltares-public-catalog-v1';
const CATALOG_REVALIDATE_AFTER = 60 * 1000;
const COLLECTIONS = ['equipment', 'solarPanels', 'greenProtect'];

let products = [];
let filtered = [];
let activeBrand = 'all';
let activeProduct = null;
let cart = readCart();

const grid = $('#catalog-grid');
const status = $('#catalog-status');
const count = $('#catalog-count');
const search = $('#catalog-search');
const filters = $('#catalog-filters');
const dialog = $('#catalog-product-dialog');
const lightbox = $('#catalog-image-lightbox');
const cartDialog = $('#catalog-cart-dialog');

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value.filter(item => item?.id && COLLECTIONS.includes(item.collection)).slice(0, 60) : [];
  } catch { return []; }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function productImage(item = {}) { return item.thumbnail || (Array.isArray(item.images) ? item.images[0] : '') || ''; }
function productName(item = {}) { return `${item.brand || ''} ${item.model || item.name || ''}`.trim(); }
function phaseLabel(value = '') { return String(value); }
function numericPrice(item = {}) {
  const digits = String(item.price || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
function productPrice(item = {}) {
  const raw = String(item.price || '').trim();
  const uah = /^\d[\d\s.,]*$/.test(raw) ? `${raw} грн` : raw;
  const usd = Number(item.priceUsd);
  const dollars = Number.isFinite(usd) && usd > 0 ? `$${Math.round(usd).toLocaleString('en-US')}` : '';
  return [uah, dollars].filter(Boolean).join(' · ') || 'За запитом';
}
function exchangeRate() {
  const rates = [...products, ...cart].map(item => {
    const uah = numericPrice(item);
    const usd = Number(item.priceUsd || 0);
    return uah > 0 && usd > 0 ? uah / usd : 0;
  }).filter(rate => rate >= 20 && rate <= 100).sort((a, b) => a - b);
  if (!rates.length) return 44;
  const middle = Math.floor(rates.length / 2);
  return rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
}
function itemPrices(item = {}, rate = exchangeRate()) {
  let uah = numericPrice(item);
  let usd = Number(item.priceUsd || 0);
  if (!uah && usd) uah = usd * rate;
  if (!usd && uah) usd = uah / rate;
  return { uah, usd, known: uah > 0 || usd > 0 };
}
function readCatalogCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
    if (cached?.items && Array.isArray(cached.items)) return cached;
    const parts = COLLECTIONS.map(collection => {
      const entry = JSON.parse(localStorage.getItem(`voltares-public-api-v1:${collection}`) || 'null');
      return entry?.data && Array.isArray(entry.data) ? { ...entry, collection } : null;
    }).filter(Boolean);
    if (!parts.length) return null;
    return {
      savedAt: Math.min(...parts.map(part => Number(part.savedAt || 0))),
      checkedAt: Math.min(...parts.map(part => Number(part.checkedAt || part.savedAt || 0))),
      etags: Object.fromEntries(parts.map(part => [part.collection, part.etag || ''])),
      items: parts.flatMap(part => part.data.map(item => ({ ...item, _collection:part.collection })))
    };
  } catch { return null; }
}
function writeCatalogCache(items, { etags = {}, savedAt = Date.now() } = {}) {
  try {
    const checkedAt = Date.now();
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ savedAt, checkedAt, etags, items }));
    COLLECTIONS.forEach(collection => {
      const data = items.filter(item => item._collection === collection).map(({ _collection, ...item }) => item);
      localStorage.setItem(`voltares-public-api-v1:${collection}`, JSON.stringify({ savedAt, checkedAt, etag:etags[collection] || '', data }));
    });
  } catch {}
}
function modelsLabel(value) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value} модель`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${value} моделі`;
  return `${value} моделей`;
}

function render() {
  if (!grid) return;
  const query = search.value.trim().toLocaleLowerCase('uk-UA');
  filtered = products.filter(item => {
    const brand = String(item.brand || '').toLocaleLowerCase('uk-UA');
    const haystack = [item.brand, item.model, item.name, item.power, item.phase, item.technology, item.category, item.voltage, item.code].filter(Boolean).join(' ').toLocaleLowerCase('uk-UA');
    return (activeBrand === 'all' || brand === activeBrand) && (!query || haystack.includes(query));
  });
  count.textContent = modelsLabel(filtered.length);
  grid.innerHTML = filtered.length ? filtered.map(item => {
    const image = productImage(item);
    const name = productName(item);
    const collection = item._collection || 'equipment';
    const added = cart.some(entry => entry.id === String(item._id) && entry.collection === collection);
    return `<article class="catalog-card" data-id="${escapeHtml(item._id || '')}" data-collection="${escapeHtml(collection)}"><span class="catalog-card-media">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" width="520" height="520">` : '⚡'}</span><span class="catalog-card-copy"><span class="catalog-card-brand">${escapeHtml(item.brand || 'ІНК')}</span><h3>${escapeHtml(item.model || item.name || '')}</h3><span class="catalog-card-specs">${escapeHtml([item.power || item.spec, phaseLabel(item.phase || item.technology || item.category), item.voltage].filter(Boolean).join(' · '))}</span><button class="catalog-card-cart${added ? ' is-added' : ''}" type="button" data-cart-id="${escapeHtml(item._id || '')}" data-cart-collection="${escapeHtml(collection)}"><span>${added ? 'Ще один до кошика' : 'Додати до кошика'}</span><b aria-hidden="true">＋</b></button><span class="catalog-card-bottom"><strong class="catalog-card-price">${escapeHtml(productPrice(item))}</strong><a class="catalog-card-detail" href="/products/${encodeURIComponent(item._id || '')}">Детальніше ↗</a></span></span></article>`;
  }).join('') : '<div class="catalog-status"><b>За вашим запитом нічого не знайдено.</b></div>';
}

function buildFilters() {
  const brands = [...new Set(products.map(item => String(item.brand || '').trim()).filter(Boolean))].sort();
  filters.innerHTML = `<button class="is-active" type="button" data-brand="all" aria-pressed="true">Усі</button>${brands.map(brand => `<button type="button" data-brand="${escapeHtml(brand.toLocaleLowerCase('uk-UA'))}" aria-pressed="false">${escapeHtml(brand)}</button>`).join('')}`;
}

function markdown(value = '') {
  const safe = escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const lines = safe.split(/\r?\n/); let html = ''; let list = false;
  for (const line of lines) {
    if (/^###?\s+/.test(line)) { if (list) { html += '</ul>'; list = false; } html += `<h3>${line.replace(/^###?\s+/, '')}</h3>`; }
    else if (/^[-•]\s+/.test(line)) { if (!list) { html += '<ul>'; list = true; } html += `<li>${line.replace(/^[-•]\s+/, '')}</li>`; }
    else if (line.trim()) { if (list) { html += '</ul>'; list = false; } html += `<p>${line}</p>`; }
  }
  if (list) html += '</ul>';
  return html;
}

async function openProduct(summary) {
  let item = summary;
  if (!item.description) {
    const collection = item._collection || 'equipment';
    const response = await fetch(`/api/${collection}/${encodeURIComponent(item._id)}`).catch(() => null);
    if (response?.ok) item = { ...item, ...await response.json(), _collection: collection };
  }
  activeProduct = item;
  const images = (Array.isArray(item.images) && item.images.length ? item.images : [item.thumbnail]).filter(Boolean);
  const main = $('.catalog-product-media>img', dialog);
  main.src = images[0] || '';
  main.alt = productName(item);
  main.setAttribute('aria-label', 'Збільшити фото товару');
  main.title = 'Натисніть на фото, щоб збільшити';
  $('.catalog-product-gallery', dialog).innerHTML = images.length > 1 ? images.map((src, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}" data-image="${escapeHtml(src)}"><img src="${escapeHtml(src)}" alt=""></button>`).join('') : '';
  $('#catalog-product-title').textContent = productName(item);
  $('.catalog-description').innerHTML = markdown(item.description || '');
  $('[data-field="power"]', dialog).textContent = item.power || item.spec || '—';
  $('[data-field="grid"]', dialog).textContent = [phaseLabel(item.phase || item.technology || item.category), item.voltage].filter(Boolean).join(' · ') || '—';
  $('[data-field="price"]', dialog).textContent = productPrice(item);
  const form = $('.catalog-enquiry-form', dialog);
  form.reset();
  $('.catalog-extra', dialog).hidden = true;
  $('.catalog-more', dialog).setAttribute('aria-expanded', 'false');
  $('.catalog-form-status', dialog).textContent = '';
  $('.catalog-add-to-cart', dialog).classList.toggle('is-added', cart.some(entry => entry.id === String(item._id) && entry.collection === item._collection));
  dialog.showModal();
  $('.catalog-product-copy', dialog).scrollTop = 0;
}

function cartSnapshot(item) {
  return { id: String(item._id), collection: item._collection || 'equipment', name: productName(item), power: item.power || item.spec || '', phase: item.phase || item.technology || item.category || '', voltage: item.voltage || '', price: item.price || '', priceUsd: Number(item.priceUsd || 0), image: productImage(item), quantity: 1 };
}

function addToCart(item, sourceButton = null) {
  if (!item?._id) return;
  const collection = item._collection || 'equipment';
  const existing = cart.find(entry => entry.id === String(item._id) && entry.collection === collection);
  if (existing) existing.quantity = Math.min(999, Number(existing.quantity || 1) + 1);
  else cart.push(cartSnapshot(item));
  saveCart();
  const button = $('.catalog-add-to-cart', dialog);
  button.classList.add('is-added');
  button.querySelector('span').textContent = 'Додано до кошика';
  setTimeout(() => { if (button.isConnected) button.querySelector('span').textContent = 'Додати до кошика'; }, 1300);
  if (sourceButton) {
    sourceButton.classList.add('is-added');
    sourceButton.querySelector('span').textContent = 'Додано — ще один?';
    setTimeout(() => { if (sourceButton.isConnected) sourceButton.querySelector('span').textContent = 'Ще один до кошика'; }, 1300);
  }
}

function renderCart() {
  const totalCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  $('#catalog-cart-count').textContent = totalCount;
  $('.catalog-cart-trigger').classList.toggle('has-items', totalCount > 0);
  $$('.catalog-card-cart').forEach(button => {
    const added = cart.some(entry => entry.id === button.dataset.cartId && entry.collection === button.dataset.cartCollection);
    button.classList.toggle('is-added', added);
    button.querySelector('span').textContent = added ? 'Ще один до кошика' : 'Додати до кошика';
  });
  const list = $('#catalog-cart-items');
  if (!list) return;
  list.innerHTML = cart.length ? cart.map((item, index) => `<article class="catalog-cart-item" data-index="${index}">${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : '<span class="catalog-cart-placeholder">⚡</span>'}<div><small>${escapeHtml([item.power, item.phase, item.voltage].filter(Boolean).join(' · '))}</small><strong>${escapeHtml(item.name)}</strong><b>${escapeHtml(productPrice(item))}</b></div><div class="catalog-cart-quantity"><button type="button" data-action="decrease" aria-label="Зменшити кількість">−</button><output aria-label="Кількість">${Number(item.quantity || 1)}</output><button type="button" data-action="increase" aria-label="Збільшити кількість">＋</button></div><button class="catalog-cart-remove" type="button" data-action="remove" aria-label="Видалити ${escapeHtml(item.name)}">×</button></article>`).join('') : '<div class="catalog-cart-empty"><b>Кошик поки порожній.</b><p>Натисніть «Додати до кошика» на потрібних товарах.</p></div>';
  const rate = exchangeRate();
  const total = cart.reduce((sum, item) => {
    const prices = itemPrices(item, rate);
    const quantity = Number(item.quantity || 1);
    sum.uah += prices.uah * quantity;
    sum.usd += prices.usd * quantity;
    return sum;
  }, { uah: 0, usd: 0 });
  const unknown = cart.some(item => !itemPrices(item, rate).known);
  $('#catalog-cart-total').textContent = `${Math.round(total.uah).toLocaleString('uk-UA')} грн · $${Math.round(total.usd).toLocaleString('en-US')}${unknown ? ' + за запитом' : ''}`;
  const submit = $('.catalog-cart-form button[type="submit"]');
  submit.disabled = !cart.length;
  $('.catalog-cart-clear').disabled = !cart.length;
}

function openLightbox() {
  const source = $('.catalog-product-media>img', dialog);
  const target = $('img', lightbox);
  if (!source.src) return;
  target.src = source.src; target.alt = source.alt; lightbox.showModal();
}

async function loadCatalog() {
  const requested = new URLSearchParams(location.search).get('type');
  const cached = readCatalogCache();
  const cachedItems = cached?.items || [];
  if (cached?.items?.length) {
    products = COLLECTIONS.includes(requested) ? cachedItems.filter(item => item._collection === requested) : cachedItems;
    status.hidden = true; buildFilters(); render(); renderCart();
  } else {
    status.hidden = false; grid.innerHTML = '';
  }
  if (cached && Date.now() - Number(cached.checkedAt || cached.savedAt || 0) < CATALOG_REVALIDATE_AFTER) return;
  const results = await Promise.all(COLLECTIONS.map(async collection => {
    const previous = cachedItems.filter(item => item._collection === collection);
    const etag = cached?.etags?.[collection] || '';
    const response = await fetch(`/api/${collection}`, { headers:etag ? {'If-None-Match':etag} : {} }).catch(() => null);
    if (response?.status === 304) return { items:previous, etag, changed:false };
    if (!response?.ok) return { items:previous, etag, changed:false };
    const items = (await response.json()).map(item => ({ ...item, _collection: collection }));
    return { items, etag:response.headers.get('etag') || '', changed:true };
  }));
  const fullCatalog = results.flatMap(result => result.items);
  const etags = Object.fromEntries(COLLECTIONS.map((collection, index) => [collection, results[index].etag]));
  writeCatalogCache(fullCatalog, { etags, savedAt:results.some(result => result.changed) ? Date.now() : Number(cached?.savedAt || Date.now()) });
  products = COLLECTIONS.includes(requested) ? fullCatalog.filter(item => item._collection === requested) : fullCatalog;
  status.hidden = true; buildFilters(); render(); renderCart();
}

grid.addEventListener('click', event => {
  const card = event.target.closest('.catalog-card');
  if (!card || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const item = products.find(product => String(product._id) === card.dataset.id && product._collection === card.dataset.collection);
  const cartButton = event.target.closest('.catalog-card-cart');
  if (cartButton) { event.preventDefault(); event.stopPropagation(); if (item) addToCart(item, cartButton); return; }
  event.preventDefault();
  if (item) openProduct(item);
});
filters.addEventListener('click', event => {
  const button = event.target.closest('button[data-brand]'); if (!button) return;
  activeBrand = button.dataset.brand;
  $$('button', filters).forEach(item => { const selected = item === button; item.classList.toggle('is-active', selected); item.setAttribute('aria-pressed', String(selected)); });
  render();
});
search.addEventListener('input', render);
$('.catalog-theme').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('voltera-theme', next); });
document.documentElement.dataset.theme = localStorage.getItem('voltera-theme') || localStorage.getItem('ink-theme') || 'dark';
$('.catalog-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$('.catalog-product-media>img', dialog).addEventListener('click', openLightbox);
$('.catalog-product-media>img', dialog).addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(); } });
$('.catalog-product-gallery', dialog).addEventListener('click', event => { const button = event.target.closest('button[data-image]'); if (!button) return; $('.catalog-product-media>img', dialog).src = button.dataset.image; $$('button', $('.catalog-product-gallery', dialog)).forEach(item => item.classList.toggle('is-active', item === button)); });
$('.catalog-image-lightbox button').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
$('.catalog-more').addEventListener('click', event => { const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true'; event.currentTarget.setAttribute('aria-expanded', String(!expanded)); $('.catalog-extra', dialog).hidden = expanded; });
$('.catalog-add-to-cart').addEventListener('click', () => addToCart(activeProduct));

$('.catalog-enquiry-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  if (!form.reportValidity() || !activeProduct) return;
  const fields = Object.fromEntries(new FormData(form).entries());
  const model = productName(activeProduct);
  const submit = $('button[type="submit"]', form); const formStatus = $('.catalog-form-status', form);
  submit.disabled = true; submit.classList.add('is-loading'); formStatus.textContent = 'Надсилаємо…';
  const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fields.name, phone: fields.phone, email: fields.email || '', city: fields.city || '', object: 'Обладнання', need: `Запит по моделі: ${model}`, comment: [`Запит із каталогу: ${model}.`, fields.note || ''].filter(Boolean).join(' '), website: fields.website || '' }) }).catch(() => null);
  const result = response ? await response.json().catch(() => ({})) : {};
  submit.disabled = false; submit.classList.remove('is-loading');
  formStatus.textContent = response?.ok ? (fields.email && result.emailCopySent ? 'Запит прийнято. Копію надіслано на email.' : 'Запит прийнято. Інженер зв’яжеться з вами.') : 'Не вдалося надіслати. Перевірте ім’я та телефон.';
});

$('.catalog-cart-trigger').addEventListener('click', () => { renderCart(); cartDialog.showModal(); });
$('.catalog-cart-close').addEventListener('click', () => cartDialog.close());
cartDialog.addEventListener('cancel', event => event.preventDefault());
$('.catalog-cart-clear').addEventListener('click', () => {
  if (!cart.length) return;
  cart = [];
  saveCart();
  $('.catalog-cart-status').textContent = 'Кошик очищено.';
});
$('#catalog-cart-items').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const index = Number(button.closest('[data-index]').dataset.index); const item = cart[index]; if (!item) return;
  if (button.dataset.action === 'increase') item.quantity = Math.min(999, Number(item.quantity || 1) + 1);
  if (button.dataset.action === 'decrease') item.quantity = Math.max(1, Number(item.quantity || 1) - 1);
  if (button.dataset.action === 'remove') cart.splice(index, 1);
  saveCart();
});
$('.catalog-cart-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  if (!cart.length || !form.reportValidity()) return;
  const fields = Object.fromEntries(new FormData(form).entries());
  const submit = $('button[type="submit"]', form); const formStatus = $('.catalog-cart-status', form);
  submit.disabled = true; submit.classList.add('is-loading'); formStatus.textContent = 'Зберігаємо комплект і надсилаємо копію…';
  const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fields.name, phone: fields.phone, email: fields.email, city: fields.city || '', object: 'Комплект обладнання', need: `Комплексний запит: ${cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0)} позицій`, comment: fields.comment || '', items: cart.map(item => ({ id: item.id, collection: item.collection, quantity: item.quantity })), website: fields.website || '' }) }).catch(() => null);
  const result = response ? await response.json().catch(() => ({})) : {};
  submit.classList.remove('is-loading');
  if (response?.ok) {
    cart = []; saveCart(); form.reset();
    const requestNumber = result._id ? ` №${String(result._id).slice(-8)}` : '';
    formStatus.textContent = result.emailCopySent ? `Заявку${requestNumber} збережено. Копія вже у вашій пошті.` : `Заявку${requestNumber} збережено, але копію не вдалося надіслати. Інженер усе одно отримав її.`;
    setTimeout(() => { if (cartDialog.open) cartDialog.close(); }, 1400);
  } else {
    submit.disabled = false;
    formStatus.textContent = result.error === 'EMAIL_REQUIRED_FOR_CART' ? 'Вкажіть коректний email для копії запиту.' : 'Не вдалося надіслати комплект. Перевірте поля та спробуйте ще раз.';
  }
});

renderCart();
loadCatalog().then(() => {
  if (location.hash === '#cart') { renderCart(); cartDialog.showModal(); }
});
