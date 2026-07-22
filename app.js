const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
if (new URLSearchParams(location.search).get('catalog') === 'all') {
  location.replace('/catalog.html');
}
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
function renderSimpleMarkdown(value = '') {
  const inline = line => escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');
  const output = [];
  let paragraph = [];
  let list = [];
  let listType = 'ul';
  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${paragraph.join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    output.push(`<${listType}>${list.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
    list = [];
  };
  String(value).replace(/\r/g, '').split('\n').forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const standaloneBold = line.match(/^\*\*(.+)\*\*$/);
    const unorderedItem = line.match(/^(?:[-*•])\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (heading || standaloneBold) {
      flushParagraph(); flushList();
      output.push(`<h3>${inline(heading ? heading[2] : standaloneBold[1])}</h3>`);
      return;
    }
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const nextType = orderedItem ? 'ol' : 'ul';
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      list.push(inline((unorderedItem || orderedItem)[1]));
      return;
    }
    flushList();
    paragraph.push(inline(line));
  });
  flushParagraph();
  flushList();
  return output.join('');
}
const pageLang = () => 'uk';
const uiText = (uk, en) => pageLang() === 'en' ? en : uk;
let activeRuntimeLanguage = pageLang();
const localizedContent = (item, key, fallback = '') => {
  if (!item || typeof item !== 'object') return fallback;
  if (pageLang() === 'en') return item[`${key}En`] || item.translations?.en?.[key] || item[key] || fallback;
  return item[key] || fallback;
};
const communityHref = () => '/community.html';
let pendingSiteRequests = 0;
let initialHashAligned = false;
function alignLocationHash() {
  if (!location.hash || location.hash === '#top') return;
  let target = null;
  try { target = document.querySelector(location.hash); } catch { return; }
  if (!target) return;
  target.scrollIntoView({ behavior: 'auto', block: 'start' });
}
const updateSiteLoading = delta => {
  pendingSiteRequests = Math.max(0, pendingSiteRequests + delta);
  document.body.classList.toggle('site-loading', pendingSiteRequests > 0);
  document.body.setAttribute('aria-busy', pendingSiteRequests > 0 ? 'true' : 'false');
  if (!pendingSiteRequests && location.hash && !initialHashAligned) {
    initialHashAligned = true;
    requestAnimationFrame(() => requestAnimationFrame(alignLocationHash));
    window.setTimeout(alignLocationHash, 350);
  }
};
const apiCache = new Map();
const PUBLIC_CACHE_PREFIX = 'voltares-public-api-v1:';
const PUBLIC_REVALIDATE_AFTER = 60 * 1000;
const PUBLIC_CACHE_TYPES = new Set(['reviews','questions','faqs','projects','articles','equipment','solarPanels','greenProtect']);
function readPublicApiCache(type) {
  if (!PUBLIC_CACHE_TYPES.has(type)) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(`${PUBLIC_CACHE_PREFIX}${type}`) || 'null');
    return cached?.data && Array.isArray(cached.data) ? cached : null;
  } catch { return null; }
}
function writePublicApiCache(type, data, { etag = '', savedAt = Date.now() } = {}) {
  if (!PUBLIC_CACHE_TYPES.has(type) || !Array.isArray(data)) return;
  try { localStorage.setItem(`${PUBLIC_CACHE_PREFIX}${type}`, JSON.stringify({ savedAt, checkedAt:Date.now(), etag, data })); } catch {}
}
async function fetchPublicApi(type, cached = null, background = false) {
  if (!background) updateSiteLoading(1);
  try {
    const response = await fetch(`/api/${type}`, { headers:cached?.etag ? {'If-None-Match':cached.etag} : {} }).catch(() => null);
    if (response?.status === 304 && cached?.data) {
      writePublicApiCache(type, cached.data, { etag:cached.etag, savedAt:Number(cached.savedAt || Date.now()) });
      return { data:cached.data, changed:false };
    }
    const result = response?.ok ? await response.json() : null;
    if (!Array.isArray(result)) return { data:cached?.data ?? null, changed:false };
    const etag = response.headers.get('etag') || '';
    const changed = !cached || (etag ? etag !== cached.etag : JSON.stringify(result) !== JSON.stringify(cached.data));
    writePublicApiCache(type, result, { etag });
    return { data:result, changed };
  } finally {
    if (!background) updateSiteLoading(-1);
  }
}
function revalidatePublicApi(type, cached) {
  fetchPublicApi(type, cached, true).then(({ data, changed }) => {
    if (!Array.isArray(data)) return;
    apiCache.set(type, Promise.resolve(data));
    if (changed) window.dispatchEvent(new CustomEvent('voltares:collection-updated', { detail:{ type } }));
  });
}
const apiList = async (type, { fresh = false } = {}) => {
  if (!fresh && apiCache.has(type)) return apiCache.get(type);
  const cached = !fresh ? readPublicApiCache(type) : null;
  if (cached) {
    apiCache.set(type, Promise.resolve(cached.data));
    if (Date.now() - Number(cached.checkedAt || cached.savedAt || 0) >= PUBLIC_REVALIDATE_AFTER) revalidatePublicApi(type, cached);
    return cached.data;
  }
  const request = fetchPublicApi(type, null, false).then(result => result.data);
  apiCache.set(type, request);
  const result = await request;
  if (result === null) apiCache.delete(type);
  else apiCache.set(type, Promise.resolve(result));
  return result;
};
const invalidateApiCache = type => {
  apiCache.delete(type);
  try { localStorage.removeItem(`${PUBLIC_CACHE_PREFIX}${type}`); } catch {}
};
const loadingMarkup = label => `<div class="section-loader"><i></i><span>${escapeHtml(label)}</span></div>`;
const emptyMarkup = (title, text) => `<div class="section-empty"><div><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div></div>`;

function syncLocalizedLinks(root = document) {
  $$('.circle-all-link, a[href="/community.html"], a[href^="/community.html#"], a[href^="/community.html?"]', root).forEach(link => {
    const hash = link.hash || '';
    link.setAttribute('href', `${communityHref()}${hash}`);
  });
}

function enhanceClickableHints(root = document) {
  const noHintSelector = '.site-header .desktop-nav a,.site-header .button-small,.section-jump-menu a';
  $$(noHintSelector, root).forEach(element => {
    delete element.dataset.hint;
    element.removeAttribute('title');
  });
  const explicitHints = [
    ['.theme-toggle', 'Перемкнути світлу / темну тему', 'Switch light / dark theme'],
    ['.menu-toggle', 'Відкрити меню сайту', 'Open site menu'],
    ['.phone', 'Показати всі телефони ІНК', 'Show all INK phone numbers'],
    ['.phone-dropdown a', 'Подзвонити за цим номером', 'Call this number'],
    ['.js-open-selector', 'Запустити швидкий підбір системи', 'Start quick system selection'],
    ['.review-prev', 'Показати попередні відгуки', 'Show previous reviews'],
    ['.review-next', 'Показати наступні відгуки', 'Show next reviews'],
    ['.review-add', 'Додати свій відгук', 'Add your review'],
    ['.project-prev', 'Гортати обʼєкти назад', 'Browse previous projects'],
    ['.project-next', 'Гортати обʼєкти вперед', 'Browse next projects'],
    ['.project-open', 'Відкрити фото та паспорт обʼєкта', 'Open project photos and details'],
    ['.grid-simulator', 'Перемкнути стан мережі', 'Toggle grid status'],
    ['.appliance', 'Додати або прибрати прилад із розрахунку', 'Add or remove this appliance from the calculation'],
    ['.brand-compare', 'Заповнити заявку з цим брендом', 'Start an enquiry for this brand'],
    ['.topic-votes button', 'Позначити питання корисним — лічильник збільшиться на один', 'Mark this question as useful — the counter will increase by one'],
    ['.topic-answers[data-answer]', 'Показати першу відповідь у цій картці', 'Show the first answer in this card'],
    ['.topic-reply-link', 'Перейти до повного обговорення та залишити свою відповідь', 'Open the full discussion and add your answer'],
    ['.faq-question', 'Відкрити відповідь без зміщення сторінки', 'Open the answer without moving the page'],
    ['.submit-button', 'Надіслати заявку в CRM', 'Send the enquiry to CRM'],
    ['.language-switcher button', 'Змінити мову сайту', 'Change site language'],
    ['.circle-all-link', 'Перейти до всіх питань', 'Open all questions'],
    ['.floating-consult', 'Швидко перейти до консультації', 'Jump to consultation'],
    ['.section-jump-trigger', 'Наведіть, щоб відкрити · натисніть, щоб закріпити меню', 'Hover to open · click to pin the menu'],
    ['.dialog-close,.answer-dialog-close,.project-dialog-close,.equipment-dialog-close,.review-form-close', 'Закрити вікно', 'Close window']
  ];
  explicitHints.forEach(([selector, uk, en]) => $$(selector, root).forEach(element => {
    if (element.matches(noHintSelector)) return;
    element.dataset.hint = uiText(uk, en);
    element.dataset.hintExplicit = 'true';
    element.removeAttribute('title');
  }));
  $$('.section-jump-trigger', root).forEach(trigger => syncSectionJumpTriggerState(trigger, trigger.closest('.section-jump')?.classList.contains('is-open')));
  $$('a,button,[role="button"]', root).forEach(element => {
    if (element.matches(noHintSelector)) return;
    if (element.dataset.hintExplicit === 'true') return;
    const label = element.getAttribute('aria-label') || element.title || element.textContent.trim().replace(/\s+/g, ' ');
    if (!label) return;
    const hint = label.length > 72 ? `${label.slice(0, 69)}…` : label;
    element.dataset.hint = hint;
    element.removeAttribute('title');
  });
}
window.INK_REFRESH_HINTS = enhanceClickableHints;

function setupScrollHud(selector, axis = 'x') {
  const target = $(selector);
  if (!target || target.nextElementSibling?.classList.contains('scroll-hud')) return;
  const nav = document.createElement('div');
  nav.className = 'scroll-hud';
  nav.innerHTML = `<button type="button" aria-label="${escapeHtml(uiText('Гортати назад', 'Scroll back'))}">←</button><button type="button" aria-label="${escapeHtml(uiText('Гортати вперед', 'Scroll forward'))}">→</button>`;
  const [prev, next] = $$('button', nav);
  const step = () => axis === 'x' ? Math.round(target.clientWidth * .82) : Math.round(target.clientHeight * .72);
  prev.addEventListener('click', () => target.classList.contains('topic-list') ? scrollTopicCards(target, -1) : target.scrollBy({ left: axis === 'x' ? -step() : 0, top: axis === 'y' ? -step() : 0, behavior: 'smooth' }));
  next.addEventListener('click', () => target.classList.contains('topic-list') ? scrollTopicCards(target, 1) : target.scrollBy({ left: axis === 'x' ? step() : 0, top: axis === 'y' ? step() : 0, behavior: 'smooth' }));
  target.insertAdjacentElement('afterend', nav);
  enhanceClickableHints(nav);
}

function topicCardScrollTop(target, card) {
  const targetTop = target.getBoundingClientRect().top;
  return Math.max(0, target.scrollTop + card.getBoundingClientRect().top - targetTop);
}

function closestTopicIndex(target, cards = $$('.topic-card', target)) {
  return cards.reduce((best, card, index) => {
    const distance = Math.abs(topicCardScrollTop(target, card) - target.scrollTop);
    return distance < best.distance ? { index, distance } : best;
  }, { index: 0, distance: Infinity }).index;
}

function scrollTopicCards(target, direction) {
  const cards = $$('.topic-card', target);
  if (!cards.length) return;
  const current = closestTopicIndex(target, cards);
  const next = Math.max(0, Math.min(cards.length - 1, current + direction));
  target.scrollTo({ top: topicCardScrollTop(target, cards[next]), behavior: 'smooth' });
}

function setupQuestionWheelSnap(selector) {
  const target = $(selector);
  if (!target) return;
  let locked = false;
  const fit = () => requestAnimationFrame(() => fitQuestionViewport(target));
  fit();
  document.fonts?.ready?.then(fit).catch(() => {});
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(fit);
    observer.observe(target);
  }
  window.addEventListener('resize', fit, { passive: true });
  target.addEventListener('wheel', event => {
    if (locked) {
      event.preventDefault();
      return;
    }
    if (Math.abs(event.deltaY) < 8) return;
    const cards = $$('.topic-card', target);
    if (!cards.length) return;
    const current = closestTopicIndex(target, cards);
    const next = current + (event.deltaY > 0 ? 1 : -1);
    if (next < 0 || next >= cards.length) return;
    event.preventDefault();
    locked = true;
    target.scrollTo({ top: topicCardScrollTop(target, cards[next]), behavior: 'smooth' });
    window.setTimeout(() => { locked = false; }, 420);
  }, { passive: false });
}

function fitQuestionViewport(target = $('.topic-list')) {
  if (!target) return;
  const cards = $$('.topic-card', target);
  if (cards.length < 2) {
    target.style.height = '';
    target.style.maxHeight = '';
    return;
  }
  const styles = getComputedStyle(target);
  const gap = Number.parseFloat(styles.rowGap || styles.gap) || 0;
  const heights = cards.map(card => card.getBoundingClientRect().height);
  const tallestPair = heights.slice(0, -1).reduce((largest, height, index) => (
    Math.max(largest, height + gap + heights[index + 1])
  ), 0);
  const viewportHeight = Math.ceil(tallestPair + 2);
  target.style.height = `${viewportHeight}px`;
  target.style.maxHeight = `${viewportHeight}px`;
}

// Header, theme and mobile navigation
const header = $('.site-header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 20), { passive: true });

const themeToggle = $('.theme-toggle');
const savedTheme = localStorage.getItem('voltera-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('voltera-theme', next);
});

const menuToggle = $('.menu-toggle');
const mobileNav = $('.mobile-nav');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', open);
  menuToggle.setAttribute('aria-label', uiText(open ? 'Закрити меню' : 'Відкрити меню', open ? 'Close menu' : 'Open menu'));
  mobileNav.classList.toggle('is-open', open);
  mobileNav.setAttribute('aria-hidden', !open);
});
$$('.mobile-nav a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('is-open');
  mobileNav.setAttribute('aria-hidden', 'true');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', uiText('Відкрити меню', 'Open menu'));
}));

// Reveal animations
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
}, { threshold: .12 });
$$('.reveal').forEach(el => observer.observe(el));

// Hero grid outage simulator
const simulator = $('.grid-simulator');
simulator.addEventListener('click', () => {
  const on = !simulator.classList.contains('is-on');
  $('.energy-stage').classList.toggle('is-grid-off', !on);
  simulator.classList.toggle('is-on', on);
  simulator.setAttribute('aria-pressed', on);
  $('.grid-label').textContent = on ? uiText('Є', 'ON') : uiText('НЕМАЄ', 'OFF');
  $('.outage-label').textContent = on ? uiText('СТАБІЛЬНА', 'STABLE') : 'OFFLINE';
  $('.grid-status').lastChild.textContent = on ? uiText(' Система активна', ' System active') : uiText(' Резерв активний', ' Backup active');
});

// Energy calculator
const appliances = $$('.appliance');
const hours = $('#hours');
const hoursOutput = $('#hours-output');
const loadResult = $('#load-result');
const batteryResult = $('#battery-result');
function updateCalculator() {
  const load = appliances.filter(item => item.classList.contains('is-active')).reduce((sum, item) => sum + Number(item.dataset.watts), 0);
  const duration = Number(hours.value);
  const capacity = Math.max(1, load * duration / 1000 / .82 * 1.05);
  loadResult.textContent = `${load} W`;
  batteryResult.textContent = `${capacity.toFixed(1)} kWh`;
  hoursOutput.textContent = duration;
  const percentage = (duration - 2) / 22 * 100;
  hours.style.background = `linear-gradient(90deg,var(--acid) ${percentage}%,#30443c ${percentage}%)`;
}
appliances.forEach(item => item.addEventListener('click', () => {
  item.classList.toggle('is-active');
  item.setAttribute('aria-pressed', String(item.classList.contains('is-active')));
  updateCalculator();
}));
hours.addEventListener('input', updateCalculator);
updateCalculator();

// Kit filtering
$$('.kit-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.kit-tabs button').forEach(btn => { btn.classList.remove('is-active'); btn.setAttribute('aria-selected', 'false'); });
  button.classList.add('is-active');
  button.setAttribute('aria-selected', 'true');
  const filter = button.dataset.filter;
  $$('.kit-card').forEach(card => card.classList.toggle('is-hidden', filter !== 'all' && !card.dataset.category.includes(filter)));
}));

// Reviews from API/CRM
const reviewForm = $('#review-form');
const reviewTrack = $('.review-track');
const reviews = [];
let reviewIndex = 0;
function showReview(index) {
  if (!reviews.length) return;
  reviewIndex = (index + reviews.length) % reviews.length;
  const desktop = window.matchMedia('(min-width: 801px)').matches;
  reviews.forEach((review, i) => {
    review.classList.toggle('is-current', i === reviewIndex);
    review.classList.toggle('is-companion', desktop && i === (reviewIndex + 1) % reviews.length);
  });
}
function createReview(data) {
  const article = document.createElement('article');
  article.className = 'review-card';
  const rating = Math.max(1, Math.min(5, Number(data.rating || 5)));
  const initials = (data.name || 'ІНК').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  const reply = String(data.reply || '').trim();
  const badge = data.verified === true ? `<b>${escapeHtml(uiText('ПЕРЕВІРЕНИЙ ВІДГУК', 'VERIFIED REVIEW'))}</b>` : '';
  const date = data.createdAt ? new Intl.DateTimeFormat(pageLang() === 'en' ? 'en-GB' : 'uk-UA', {year:'numeric',month:'short'}).format(new Date(data.createdAt)) : '';
  const reviewMeta = [data.city || uiText('Україна', 'Ukraine'), date].filter(Boolean).join(' · ');
  article.innerHTML = `<div class="stars" aria-label="${rating} ${escapeHtml(uiText('з 5', 'out of 5'))}">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><blockquote>«${escapeHtml(localizedContent(data, 'text'))}»</blockquote>${reply ? `<div class="team-reply"><span>↳ ${escapeHtml(uiText('ВІДПОВІДЬ ІНК', 'INK RESPONSE'))}</span><p>${escapeHtml(localizedContent(data, 'reply', reply))}</p></div>` : ''}<footer><div class="avatar">${escapeHtml(initials)}</div><div><strong>${escapeHtml(data.name || uiText('Клієнт ІНК', 'INK client'))}</strong><span>${escapeHtml(reviewMeta)}</span></div>${badge}</footer>`;
  reviewTrack.append(article);
  reviews.push(article);
  return article;
}
async function loadReviews() {
  reviewTrack.innerHTML = loadingMarkup(uiText('Завантажуємо відгуки…', 'Loading reviews…'));
  const data = await apiList('reviews');
  reviews.splice(0, reviews.length);
  if (!Array.isArray(data) || !data.length) { reviewTrack.innerHTML = emptyMarkup(uiText('Відгуків поки немає', 'No reviews yet'), uiText('Будьте першим, хто поділиться досвідом.', 'Be the first to share your experience.')); return; }
  reviewTrack.innerHTML = '';
  data.forEach(createReview);
  showReview(0);
  enhanceClickableHints(reviewTrack);
}
$('.review-prev').addEventListener('click', () => showReview(reviewIndex - (window.innerWidth > 800 ? 2 : 1)));
$('.review-next').addEventListener('click', () => showReview(reviewIndex + (window.innerWidth > 800 ? 2 : 1)));
$('.review-add').addEventListener('click', () => {
  reviewForm.hidden = false;
  reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('.review-form-close').addEventListener('click', () => { reviewForm.hidden = true; });
reviewForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;
  const fields = new FormData(reviewForm);
  const data = { name: fields.get('name'), city: fields.get('city'), rating: fields.get('rating'), text: fields.get('text'), website: fields.get('website') || '' };
  const submit = reviewForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.classList.add('is-sending');
  submit.textContent = uiText('Публікуємо…', 'Publishing…');
  const response = await fetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).catch(() => null);
  submit.disabled = false;
  submit.classList.remove('is-sending');
  submit.textContent = uiText('Опублікувати відгук ↗', 'Publish review ↗');
  if (!response?.ok) { submit.textContent = uiText('Помилка. Спробуйте ще раз', 'Error. Please try again'); return; }
  await reviewsReady;
  if (!reviews.length) reviewTrack.innerHTML = '';
  createReview({...data, rating:Number(data.rating), status:'published', verified:false});
  showReview(reviews.length - 1);
  reviewForm.reset();
  reviewForm.hidden = true;
  reviewTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
showReview(0);
const reviewsReady = loadReviews();

// Brand comparison starts a consultation with useful context already filled in.
$$('.brand-compare').forEach(button => button.addEventListener('click', () => {
  const comment = $('#lead-form textarea[name="comment"]');
  comment.value = uiText(`Хочу порівняти ${button.dataset.brand} з іншими інверторами під мій об'єкт.`, `I would like to compare ${button.dataset.brand} with other inverters for my property.`);
  $('#consultation').scrollIntoView({ behavior: 'smooth' });
}));

// Project passport lightbox and homepage gallery from API
const projectDialog = $('#project-dialog');
const projectGrid = $('.project-grid');
const projectData = new Map();
let projectReturnY = 0;
function projectFromButton(button) {
  const card = button.closest('.project-card');
  const image = button.querySelector('img');
  const meta = card?.querySelector('.project-meta');
  const title = meta?.querySelector('h3')?.textContent || image?.alt || 'Обʼєкт ІНК';
  const copy = meta?.querySelector('p')?.textContent?.trim() || 'Паспорт системи редагується в CRM.';
  const label = meta?.querySelector('span')?.textContent || 'Україна · обʼєкт';
  const stats = label.split('·').map(item => item.trim()).filter(Boolean);
  return {
    image: image?.getAttribute('src') || '/assets/projects/home-backup.jpg',
    title,
    copy,
    stats: [stats[0] || 'обʼєкт', stats[1] || 'Україна', stats[2] || 'опубліковано']
  };
}
function openProject(button) {
  if (!projectDialog || !button) return;
  projectReturnY = window.scrollY;
  const data = projectData.get(button.dataset.project) || projectFromButton(button);
  $('img', projectDialog).src = data.image;
  $('img', projectDialog).alt = button.querySelector('img')?.alt || data.title;
  $('h2', projectDialog).textContent = data.title;
  $('.project-dialog-copy', projectDialog).textContent = data.copy;
  $$('#project-dialog dd').forEach((item, index) => { item.textContent = data.stats[index] || '—'; });
  projectDialog.setAttribute('open', '');
  projectDialog.setAttribute('aria-modal', 'true');
  projectDialog.classList.add('is-open');
  requestAnimationFrame(() => window.scrollTo({ top: projectReturnY, left: window.scrollX, behavior: 'auto' }));
}
function closeProjectDialog() {
  if (!projectDialog) return;
  projectDialog.classList.remove('is-open');
  projectDialog.removeAttribute('aria-modal');
  projectDialog.removeAttribute('open');
  requestAnimationFrame(() => window.scrollTo({ top: projectReturnY, left: window.scrollX, behavior: 'auto' }));
}
function bindProjectButtons() {
  $$('.project-open').forEach(button => {
    button.type = 'button';
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    if (button.dataset.boundProjectOpen) return;
    button.dataset.boundProjectOpen = 'true';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openProject(button);
    });
  });
}
function renderProjectCard(project, index) {
  const id = String(project._id || index);
  const large = index === 0 ? ' project-large' : '';
  const title = localizedContent(project, 'title', uiText('Обʼєкт ІНК', 'INK project'));
  const description = localizedContent(project, 'description');
  const type = localizedContent(project, 'type', uiText('об’єкт', 'project'));
  const city = localizedContent(project, 'city', uiText('Україна', 'Ukraine'));
  const status = project.status === 'published' ? uiText('Опубліковано', 'Published') : uiText('Активний', 'Active');
  projectData.set(id, { image:project.image || '/assets/projects/home-backup.jpg', title:`${title} / ${city}`, copy:description || uiText('Паспорт системи редагується в адмінці.', 'Project details are maintained in CRM.'), stats:[type, city, status] });
  return `<article class="project-card${large} reveal visible"><button type="button" class="project-open" data-project="${escapeHtml(id)}" aria-label="${escapeHtml(uiText('Відкрити обʼєкт', 'Open project'))} ${escapeHtml(title)}"><img src="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(title)}" loading="lazy"><span class="project-arrow">↗</span></button><div class="project-meta"><div><span>${escapeHtml(city)} · ${escapeHtml(type)} · ${escapeHtml(status)}</span><h3>${escapeHtml(title)}</h3></div><p>${escapeHtml(description)}</p></div></article>`;
}
async function loadProjects() {
  projectGrid.innerHTML = loadingMarkup(uiText('Завантажуємо об’єкти…', 'Loading projects…'));
  const data = await apiList('projects');
  if (!Array.isArray(data) || !data.length) { projectGrid.innerHTML = emptyMarkup(uiText('Географія оновлюється', 'Projects are being updated'), uiText('Нові об’єкти з’являться після перевірки та схвалення технічним відділом.', 'New projects will appear after review and approval by our technical team.')); return; }
  projectData.clear();
  projectGrid.innerHTML = data.slice(0, 6).map(renderProjectCard).join('');
  bindProjectButtons();
  enhanceClickableHints(projectGrid);
}
bindProjectButtons();
$('.project-dialog-close').addEventListener('click', closeProjectDialog);
projectDialog.addEventListener('click', event => { if (event.target === projectDialog) closeProjectDialog(); });
projectDialog.addEventListener('close', () => {
  projectDialog.classList.remove('is-open');
  projectDialog.removeAttribute('aria-modal');
  requestAnimationFrame(() => window.scrollTo({ top: projectReturnY, left: window.scrollX, behavior: 'auto' }));
});
projectGrid?.addEventListener('click', event => {
  const button = event.target.closest('.project-open');
  if (!button || !projectGrid.contains(button)) return;
  openProject(button);
});
projectGrid?.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const button = event.target.closest('.project-open');
  if (!button || !projectGrid.contains(button)) return;
  event.preventDefault();
  openProject(button);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && projectDialog?.classList.contains('is-open')) closeProjectDialog();
});
$('.project-next').addEventListener('click', () => { if (projectGrid.firstElementChild) projectGrid.append(projectGrid.firstElementChild); });
$('.project-prev').addEventListener('click', () => { if (projectGrid.lastElementChild) projectGrid.prepend(projectGrid.lastElementChild); });
loadProjects();

// Equipment from CRM
const publicEquipment = $('#public-equipment');
const equipmentDialog = $('#equipment-dialog');
const equipmentSearch = $('#equipment-search');
const equipmentPrev = $('#equipment-prev');
const equipmentNext = $('#equipment-next');
const equipmentPageLabel = $('#equipment-page-label');
const equipmentAllLink = $('#equipment-all-link');
const equipmentImageLightbox = $('#equipment-image-lightbox');
const equipmentCartKey = 'voltares-catalog-cart-v1';
const equipmentItems = new Map();
const equipmentPageSize = 6;
let equipmentData = [];
let equipmentPage = 0;
let equipmentReturnY = 0;
let equipmentRestoreScroll = true;
let equipmentPageLocked = false;
let equipmentBodyStyle = null;
let activeEquipmentItem = null;
let activeEquipmentBrand = 'all';
let equipmentTitleFitFrame = 0;
function readHomepageCart() {
  try { const value = JSON.parse(localStorage.getItem(equipmentCartKey) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function updateHomepageCartAction(item = activeEquipmentItem) {
  const cart = readHomepageCart();
  const collection = item?._collection || 'equipment';
  const count = cart.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  $$('.homepage-cart-count').forEach(element => { element.textContent = count; });
  $$('.homepage-cart-label').forEach(element => { element.textContent = uiText('Кошик', 'Cart'); });
  const inCart = item?._id && cart.some(entry => entry.id === String(item._id) && entry.collection === collection);
  const button = $('.equipment-add-to-cart', equipmentDialog);
  const link = $('.equipment-open-cart', equipmentDialog);
  if (button) { button.classList.toggle('is-added', Boolean(inCart)); button.firstChild.textContent = inCart ? uiText('Додати ще один ', 'Add one more ') : uiText('Додати до кошика ', 'Add to cart '); }
  if (link) link.firstChild.textContent = count ? uiText(`Відкрити кошик (${count}) і надіслати `, `Open cart (${count}) and send `) : uiText('Відкрити кошик і надіслати ', 'Open cart and send ');
}
updateHomepageCartAction(null);
window.addEventListener('pageshow', () => updateHomepageCartAction(null));
window.addEventListener('storage', event => { if (event.key === equipmentCartKey) updateHomepageCartAction(null); });
function addActiveEquipmentToCart() {
  const item = activeEquipmentItem;
  if (!item?._id) return;
  const cart = readHomepageCart();
  const collection = item._collection || 'equipment';
  const existing = cart.find(entry => entry.id === String(item._id) && entry.collection === collection);
  if (existing) existing.quantity = Math.min(999, Number(existing.quantity || 1) + 1);
  else cart.push({ id:String(item._id), collection, name:`${item.brand || ''} ${item.model || item.name || ''}`.trim(), power:item.power || item.spec || '', phase:item.phase || item.technology || item.category || '', voltage:item.voltage || '', price:item.price || '', priceUsd:Number(item.priceUsd || 0), image:(Array.isArray(item.images) ? item.images[0] : '') || item.thumbnail || item.image || '', quantity:1 });
  localStorage.setItem(equipmentCartKey, JSON.stringify(cart.slice(0, 60)));
  updateHomepageCartAction(item);
  const button = $('.equipment-add-to-cart', equipmentDialog);
  if (button) { button.classList.add('is-confirmed'); window.setTimeout(() => button.classList.remove('is-confirmed'), 700); }
}

const homepageCartDialog = $('#homepage-cart-dialog');
const homepageCartItems = $('#homepage-cart-items');
const homepageCartTotal = $('#homepage-cart-total');
const homepageCartForm = $('.homepage-cart-form');
const homepageCartStatus = $('.homepage-cart-status');
function homepageCartNumericPrice(item = {}) {
  const digits = String(item.price || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}
function homepageCartRate(cart = readHomepageCart()) {
  const rates = cart.map(item => {
    const uah = homepageCartNumericPrice(item);
    const usd = Number(item.priceUsd || 0);
    return uah > 0 && usd > 0 ? uah / usd : 0;
  }).filter(rate => rate >= 20 && rate <= 100).sort((a, b) => a - b);
  if (!rates.length) return 44;
  return rates[Math.floor(rates.length / 2)];
}
function homepageCartPrices(item = {}, rate = 44) {
  let uah = homepageCartNumericPrice(item);
  let usd = Number(item.priceUsd || 0);
  if (!uah && usd) uah = usd * rate;
  if (!usd && uah) usd = uah / rate;
  return { uah, usd, known: uah > 0 || usd > 0 };
}
function saveHomepageCart(cart) {
  localStorage.setItem(equipmentCartKey, JSON.stringify(cart.slice(0, 60)));
  updateHomepageCartAction(null);
  renderHomepageCart();
}
function renderHomepageCart() {
  if (!homepageCartItems || !homepageCartTotal || !homepageCartForm) return;
  const cart = readHomepageCart();
  homepageCartItems.innerHTML = cart.length ? cart.map((item, index) => `<article class="homepage-cart-item" data-index="${index}">${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : '<span class="homepage-cart-placeholder">⚡</span>'}<div><small>${escapeHtml([item.power, item.phase, item.voltage].filter(Boolean).join(' · '))}</small><strong>${escapeHtml(item.name)}</strong><b>${escapeHtml(equipmentPriceLabel(item))}</b></div><div class="homepage-cart-quantity"><button type="button" data-action="decrease" aria-label="${escapeHtml(uiText('Зменшити кількість', 'Decrease quantity'))}">−</button><output aria-label="${escapeHtml(uiText('Кількість', 'Quantity'))}">${Number(item.quantity || 1)}</output><button type="button" data-action="increase" aria-label="${escapeHtml(uiText('Збільшити кількість', 'Increase quantity'))}">＋</button></div><button class="homepage-cart-remove" type="button" data-action="remove" aria-label="${escapeHtml(uiText('Видалити', 'Remove'))} ${escapeHtml(item.name)}">×</button></article>`).join('') : `<div class="homepage-cart-empty"><b>${escapeHtml(uiText('Кошик поки порожній.', 'Your cart is empty.'))}</b><p>${escapeHtml(uiText('Додайте потрібні товари в розділі обладнання або в повному каталозі.', 'Add products from the equipment section or the full catalogue.'))}</p></div>`;
  const rate = homepageCartRate(cart);
  const total = cart.reduce((sum, item) => {
    const prices = homepageCartPrices(item, rate);
    const quantity = Number(item.quantity || 1);
    sum.uah += prices.uah * quantity;
    sum.usd += prices.usd * quantity;
    return sum;
  }, { uah:0, usd:0 });
  const unknown = cart.some(item => !homepageCartPrices(item, rate).known);
  homepageCartTotal.textContent = `${Math.round(total.uah).toLocaleString('uk-UA')} грн · $${Math.round(total.usd).toLocaleString('en-US')}${unknown ? uiText(' + за запитом', ' + on request') : ''}`;
  $('button[type="submit"]', homepageCartForm).disabled = !cart.length;
  $('.homepage-cart-clear', homepageCartForm).disabled = !cart.length;
}
function openHomepageCart(event) {
  event?.preventDefault();
  if (!homepageCartDialog) return;
  if (equipmentDialog?.open) {
    equipmentRestoreScroll = false;
    closeEquipmentDialog();
    unlockEquipmentPage();
    equipmentRestoreScroll = true;
  }
  renderHomepageCart();
  homepageCartStatus.textContent = '';
  if (!homepageCartDialog.open) homepageCartDialog.showModal();
}
$$('.homepage-cart-trigger, .equipment-open-cart').forEach(trigger => trigger.addEventListener('click', openHomepageCart));
$('.homepage-cart-close')?.addEventListener('click', () => homepageCartDialog?.close());
homepageCartDialog?.addEventListener('cancel', event => event.preventDefault());
homepageCartItems?.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const cart = readHomepageCart();
  const index = Number(button.closest('[data-index]')?.dataset.index);
  const item = cart[index];
  if (!item) return;
  if (button.dataset.action === 'increase') item.quantity = Math.min(999, Number(item.quantity || 1) + 1);
  if (button.dataset.action === 'decrease') item.quantity = Math.max(1, Number(item.quantity || 1) - 1);
  if (button.dataset.action === 'remove') cart.splice(index, 1);
  saveHomepageCart(cart);
});
$('.homepage-cart-clear')?.addEventListener('click', () => {
  saveHomepageCart([]);
  homepageCartStatus.textContent = uiText('Кошик очищено.', 'Cart cleared.');
});
homepageCartForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const cart = readHomepageCart();
  if (!cart.length || !form.reportValidity()) return;
  const fields = Object.fromEntries(new FormData(form).entries());
  const submit = $('button[type="submit"]', form);
  submit.disabled = true;
  submit.classList.add('is-loading');
  homepageCartStatus.textContent = fields.email ? uiText('Зберігаємо комплект і надсилаємо копію…', 'Saving the set and sending your copy…') : uiText('Зберігаємо комплект…', 'Saving the set…');
  const response = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:fields.name, phone:fields.phone, email:fields.email || '', city:fields.city || '', object:'Комплект обладнання', need:`Комплексний запит: ${cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0)} позицій`, comment:fields.comment || '', items:cart.map(item => ({ id:item.id, collection:item.collection, quantity:item.quantity })), website:fields.website || '' }) }).catch(() => null);
  const result = response ? await response.json().catch(() => ({})) : {};
  submit.classList.remove('is-loading');
  if (!response?.ok) {
    submit.disabled = false;
    homepageCartStatus.textContent = result.error === 'INVALID_EMAIL_FOR_CART' ? uiText('Перевірте email для копії запиту або залиште поле порожнім.', 'Check the email for your copy or leave it blank.') : uiText('Не вдалося надіслати комплект. Перевірте поля та спробуйте ще раз.', 'Could not send the set. Check the fields and try again.');
    return;
  }
  saveHomepageCart([]);
  form.reset();
  const requestNumber = result._id ? ` №${String(result._id).slice(-8)}` : '';
  homepageCartStatus.textContent = !fields.email
    ? uiText(`Заявку${requestNumber} збережено. Інженер зв’яжеться з вами.`, `Enquiry${requestNumber} saved. An engineer will contact you.`)
    : result.emailCopySent
      ? uiText(`Заявку${requestNumber} збережено. Копія вже у вашій пошті.`, `Enquiry${requestNumber} saved. The copy is in your inbox.`)
      : uiText(`Заявку${requestNumber} збережено, але копію не вдалося надіслати. Інженер усе одно отримав її.`, `Enquiry${requestNumber} saved, but the email copy could not be sent. The engineer still received it.`);
  window.setTimeout(() => { if (homepageCartDialog?.open) homepageCartDialog.close(); }, 1800);
});
renderHomepageCart();
if (location.hash === '#cart') openHomepageCart();
function fitEquipmentCardTitles() {
  equipmentTitleFitFrame = 0;
  $$('.equipment-card h3', publicEquipment).forEach(title => {
    if (title.closest('.equipment-card')?.hidden || !title.clientWidth) return;
    title.style.fontSize = '';
    const preferredSize = Number.parseFloat(getComputedStyle(title).fontSize) || 34;
    if (title.scrollWidth <= title.clientWidth) return;
    let minimumSize = 14;
    let maximumSize = preferredSize;
    for (let step = 0; step < 8; step += 1) {
      const candidate = (minimumSize + maximumSize) / 2;
      title.style.fontSize = `${candidate}px`;
      if (title.scrollWidth <= title.clientWidth) minimumSize = candidate;
      else maximumSize = candidate;
    }
    title.style.fontSize = `${Math.floor(minimumSize * 10) / 10}px`;
  });
}
function scheduleEquipmentTitleFit() {
  if (equipmentTitleFitFrame) cancelAnimationFrame(equipmentTitleFitFrame);
  equipmentTitleFitFrame = requestAnimationFrame(fitEquipmentCardTitles);
}
function homepageEquipmentOrder(items = []) {
  const active = items.filter(item => (item.homeMode || 'auto') !== 'hidden');
  const featured = active.filter(item => item.homeMode === 'featured').sort((a, b) => Number(a.homeOrder || Number.MAX_SAFE_INTEGER) - Number(b.homeOrder || Number.MAX_SAFE_INTEGER));
  const automatic = active.filter(item => item.homeMode !== 'featured').sort((a, b) => Number(b.views || 0) - Number(a.views || 0) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return [...featured, ...automatic];
}
function lockEquipmentPage() {
  if (equipmentPageLocked) return;
  const body = document.body;
  const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  equipmentBodyStyle = { position:body.style.position, top:body.style.top, left:body.style.left, right:body.style.right, width:body.style.width, overflow:body.style.overflow, paddingRight:body.style.paddingRight };
  body.style.position = 'fixed';
  body.style.top = `-${equipmentReturnY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (scrollbarGap) body.style.paddingRight = `${scrollbarGap}px`;
  equipmentPageLocked = true;
}
function unlockEquipmentPage() {
  if (!equipmentPageLocked) return;
  const body = document.body;
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  Object.assign(body.style, equipmentBodyStyle || { position:'', top:'', left:'', right:'', width:'', overflow:'', paddingRight:'' });
  equipmentBodyStyle = null;
  equipmentPageLocked = false;
  window.scrollTo({ top:equipmentReturnY, left:window.scrollX, behavior:'auto' });
  root.style.scrollBehavior = previousScrollBehavior;
}
function applyEquipmentFilters() {
  const query = (equipmentSearch?.value || '').trim().toLocaleLowerCase();
  const availableBrands = new Set(equipmentData.map(item => String(item.brand || '').trim().toLocaleLowerCase()).filter(Boolean));
  $$('.equipment-filter button').forEach(button => {
    const brand = button.dataset.brandFilter || 'all';
    button.hidden = brand !== 'all' && !availableBrands.has(brand);
  });
  if (activeEquipmentBrand !== 'all' && !availableBrands.has(activeEquipmentBrand)) {
    activeEquipmentBrand = 'all';
    $$('.equipment-filter button').forEach(button => {
      const selected = button.dataset.brandFilter === 'all';
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  const filtered = equipmentData.filter(item => {
    const brand = String(item.brand || '').trim().toLocaleLowerCase();
    const haystack = [item.brand, item.model, item.power, item.phase, item.voltage].filter(Boolean).join(' ').toLocaleLowerCase();
    return (activeEquipmentBrand === 'all' || brand === activeEquipmentBrand) && (!query || haystack.includes(query));
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / equipmentPageSize));
  equipmentPage = Math.min(Math.max(0, equipmentPage), pageCount - 1);
  const visibleItems = filtered.slice(equipmentPage * equipmentPageSize, (equipmentPage + 1) * equipmentPageSize);
  if (publicEquipment) {
    publicEquipment.innerHTML = visibleItems.length
      ? visibleItems.map(renderPublicEquipment).join('')
      : emptyMarkup(uiText('Нічого не знайдено', 'Nothing found'), uiText('Змініть бренд або пошуковий запит.', 'Try another brand or search query.'));
    bindEquipmentCards(visibleItems);
    enhanceClickableHints(publicEquipment);
  }
  if (equipmentPageLabel) equipmentPageLabel.textContent = `${equipmentPage + 1} / ${pageCount}`;
  if (equipmentPrev) {
    equipmentPrev.disabled = equipmentPage === 0;
  }
  if (equipmentNext) {
    equipmentNext.disabled = equipmentPage >= pageCount - 1;
  }
  if (equipmentAllLink) {
    equipmentAllLink.href = '/catalog.html';
    equipmentAllLink.textContent = uiText('Увесь каталог ↗', 'Full catalogue ↗');
  }
  scheduleEquipmentTitleFit();
}
window.addEventListener('resize', scheduleEquipmentTitleFit, { passive: true });
equipmentSearch?.addEventListener('input', () => { equipmentPage = 0; applyEquipmentFilters(); });
$$('.equipment-filter button').forEach(button => button.addEventListener('click', () => {
  equipmentPage = 0;
  activeEquipmentBrand = button.dataset.brandFilter || 'all';
  $$('.equipment-filter button').forEach(item => {
    const selected = item === button;
    item.classList.toggle('is-active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  applyEquipmentFilters();
}));
equipmentPrev?.addEventListener('click', () => {
  if (equipmentPage <= 0) return;
  equipmentPage -= 1;
  applyEquipmentFilters();
});
equipmentNext?.addEventListener('click', () => {
  equipmentPage += 1;
  applyEquipmentFilters();
});
function renderPublicEquipment(item) {
  const status = item.status === 'active' ? uiText('Активний', 'Active') : uiText('На перевірці', 'Under review');
  const phase = pageLang() === 'en' ? String(item.phase || '—').replace(/фази/gi, 'phases').replace(/фаза/gi, 'phase') : item.phase || '—';
  const thumbnail = item.thumbnail || (Array.isArray(item.images) ? item.images[0] : '') || item.image || '';
  const image = thumbnail ? `<img class="equipment-card-thumb" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(`${item.brand || ''} ${item.model || ''}`.trim())}" loading="lazy">` : '<span class="equipment-card-thumb equipment-card-thumb-empty" aria-hidden="true">⚡</span>';
  const price = equipmentPriceLabel(item);
  return `<button class="equipment-card reveal visible" type="button" data-equipment="${escapeHtml(String(item._id || item.model || ''))}" aria-label="${escapeHtml(uiText('Відкрити опис', 'Open details for'))} ${escapeHtml(item.brand || '')} ${escapeHtml(item.model || '')}">${image}<span>${escapeHtml(item.brand || 'ІНК')}</span><h3>${escapeHtml(item.model || uiText('Модель', 'Model'))}</h3><p>${escapeHtml(item.power || '—')} · ${escapeHtml(phase)} · ${escapeHtml(item.voltage || '—')}</p><strong class="equipment-card-price">${escapeHtml(price)}</strong><b><i>${escapeHtml(status)}</i><em>${escapeHtml(uiText('Детальніше ↗', 'Details ↗'))}</em></b></button>`;
}
function equipmentPriceLabel(item = {}) {
  const rawUah = String(item.price || '').trim();
  const uah = /^\d[\d\s.,]*$/.test(rawUah) ? `${rawUah} грн` : rawUah;
  const usd = Number(item.priceUsd);
  const usdLabel = Number.isFinite(usd) && usd > 0 ? `$${Math.round(usd).toLocaleString('en-US')}` : '';
  return [uah, usdLabel].filter(Boolean).join(' · ') || uiText('За запитом', 'On request');
}
const equipmentDetailCache = new Map();
async function openEquipment(item) {
  if (!equipmentDialog || !item) return;
  equipmentReturnY = window.scrollY;
  equipmentRestoreScroll = true;
  const itemId = String(item._id || '');
  const collection = ['equipment','solarPanels','greenProtect'].includes(item._collection) ? item._collection : 'equipment';
  if (itemId && !item.description && !item.image && !(Array.isArray(item.images) && item.images.length)) {
    updateSiteLoading(1);
    try {
      let request = equipmentDetailCache.get(itemId);
      if (!request) {
        request = fetch(`/api/${collection}/${encodeURIComponent(itemId)}`).then(response => response.ok ? response.json() : null).catch(() => null);
        equipmentDetailCache.set(itemId, request);
      }
      const detail = await request;
      if (detail) {
        item = {...item, ...detail};
        equipmentItems.set(itemId, item);
      } else equipmentDetailCache.delete(itemId);
    } finally {
      updateSiteLoading(-1);
    }
  }
  activeEquipmentItem = item;
  const contentPane = equipmentDialog.querySelector(':scope > div');
  const resetDialogScroll = () => {
    if (contentPane) contentPane.scrollTop = 0;
    equipmentDialog.scrollTop = 0;
  };
  resetDialogScroll();
  const images = Array.isArray(item.images) && item.images.length ? item.images : [item.image || '/assets/projects/home-backup.jpg'];
  const image = images[0];
  const mainImage = $('img', equipmentDialog);
  mainImage.src = image;
  mainImage.alt = `${item.brand || ''} ${item.model || ''}`.trim();
  mainImage.tabIndex = 0;
  mainImage.setAttribute('role', 'button');
  mainImage.setAttribute('aria-label', uiText('Збільшити фото товару', 'Enlarge product photo'));
  mainImage.title = uiText('Натисніть, щоб збільшити фото', 'Click to enlarge the photo');
  let gallery = $('.equipment-dialog-gallery', equipmentDialog);
  if (!gallery) {
    gallery = document.createElement('div');
    gallery.className = 'equipment-dialog-gallery';
    $('.eyebrow', equipmentDialog).insertAdjacentElement('beforebegin', gallery);
  }
  gallery.innerHTML = images.length > 1 ? images.map((src, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}" data-equipment-image="${escapeHtml(src)}" aria-label="${escapeHtml(uiText('Фото', 'Photo'))} ${index + 1}"><img src="${escapeHtml(src)}" alt=""></button>`).join('') : '';
  $$('[data-equipment-image]', gallery).forEach(button => button.addEventListener('click', () => {
    mainImage.src = button.dataset.equipmentImage;
    $$('button', gallery).forEach(item => item.classList.toggle('is-active', item === button));
  }));
  $('h2', equipmentDialog).textContent = `${item.brand || 'ІНК'} ${item.model || ''}`.trim();
  $('.equipment-dialog-copy', equipmentDialog).innerHTML = renderSimpleMarkdown(localizedContent(item, 'description', uiText('Товар можна придбати окремо. Його призначення та основні характеристики вказані в картці.', 'This product can be purchased separately. Its purpose and key specifications are shown in the product card.')));
  $('[data-equipment-field="power"]', equipmentDialog).textContent = item.power || '—';
  $('[data-equipment-field="grid"]', equipmentDialog).textContent = [item.phase, item.voltage].filter(Boolean).join(' · ') || '—';
  $('[data-equipment-field="price"]', equipmentDialog).textContent = equipmentPriceLabel(item);
  updateHomepageCartAction(item);
  const orderForm = $('.equipment-order-form', equipmentDialog);
  const orderStatus = $('.equipment-order-status', equipmentDialog);
  const extraFields = $('.equipment-extra-fields', equipmentDialog);
  const moreToggle = $('.equipment-more-toggle', equipmentDialog);
  if (orderForm) {
    orderForm.reset();
    orderForm.classList.remove('is-sent');
  }
  if (extraFields) extraFields.hidden = true;
  if (moreToggle) {
    moreToggle.setAttribute('aria-expanded', 'false');
    $('span', moreToggle).textContent = '↓';
  }
  if (orderStatus) orderStatus.textContent = '';
  lockEquipmentPage();
  if (typeof equipmentDialog.showModal === 'function') equipmentDialog.showModal();
  else equipmentDialog.setAttribute('open', '');
  requestAnimationFrame(() => {
    resetDialogScroll();
    $('.equipment-dialog-close', equipmentDialog)?.focus({ preventScroll:true });
  });
  window.setTimeout(resetDialogScroll, 80);
  if (itemId && collection === 'equipment') fetch(`/api/equipment/${encodeURIComponent(itemId)}/view`, { method:'POST', keepalive:true }).then(response => response.ok ? response.json() : null).then(result => { if (result?.views !== undefined) item.views = result.views; }).catch(() => null);
}

function openEquipmentImageLightbox() {
  if (!equipmentImageLightbox || !equipmentDialog) return;
  const source = $('img', equipmentDialog);
  const target = $('img', equipmentImageLightbox);
  if (!source?.src || !target) return;
  target.src = source.src;
  target.alt = source.alt;
  if (typeof equipmentImageLightbox.showModal === 'function') equipmentImageLightbox.showModal();
  else equipmentImageLightbox.setAttribute('open', '');
}
$(':scope > img', equipmentDialog)?.addEventListener('click', openEquipmentImageLightbox);
$(':scope > img', equipmentDialog)?.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openEquipmentImageLightbox();
});
$('.equipment-image-lightbox-close')?.addEventListener('click', () => equipmentImageLightbox?.close());
equipmentImageLightbox?.addEventListener('click', event => { if (event.target === equipmentImageLightbox) equipmentImageLightbox.close(); });

$('.equipment-more-toggle')?.addEventListener('click', event => {
  const button = event.currentTarget;
  const fields = $('.equipment-extra-fields', equipmentDialog);
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  fields.hidden = expanded;
  $('span', button).textContent = expanded ? '↓' : '↑';
});
$('.equipment-add-to-cart')?.addEventListener('click', addActiveEquipmentToCart);

$('.equipment-order-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity() || !activeEquipmentItem) return;
  const fields = Object.fromEntries(new FormData(form).entries());
  const model = `${activeEquipmentItem.brand || ''} ${activeEquipmentItem.model || ''}`.replace(/\s+/g, ' ').trim();
  const payload = {
    name: fields.name,
    phone: fields.phone,
    email: fields.email || '',
    city: fields.city || '',
    object: 'Обладнання',
    need: `Запит по моделі: ${model}`,
    comment: [`Клієнт надіслав запит із картки моделі ${model}.`, fields.note ? `Нотатка клієнта: ${fields.note}` : '', 'Джерело: картка обладнання.'].filter(Boolean).join(' '),
    website: fields.website || ''
  };
  const submit = $('.equipment-order-submit', form);
  submit.disabled = true;
  submit.classList.add('is-sending');
  const status = $('.equipment-order-status', form);
  status.textContent = uiText('Надсилаємо…', 'Sending…');
  const response = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).catch(() => null);
  submit.disabled = false;
  submit.classList.remove('is-sending');
  if (!response?.ok) {
    status.textContent = uiText('Не вдалося надіслати. Перевірте ім’я та телефон і повторіть.', 'Could not send. Check your name and phone number and try again.');
    return;
  }
  form.classList.add('is-sent');
  status.textContent = uiText('Запит прийнято. Інженер зв’яжеться з вами найближчим часом.', 'Enquiry received. An engineer will contact you shortly.');
});
function bindEquipmentCards(items = []) {
  equipmentItems.clear();
  items.forEach(item => equipmentItems.set(String(item._id || item.model || ''), item));
  $$('.equipment-public-grid .equipment-card, .equipment-public-grid article').forEach((card, index) => {
    const item = items[index];
    if (!card.dataset.equipment) card.dataset.equipment = String(item?._id || item?.model || card.querySelector('h3')?.textContent || index);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
  });
}
function equipmentFromCard(card) {
  return equipmentItems.get(card.dataset.equipment) || {
    brand: card.querySelector('span')?.textContent,
    model: card.querySelector('h3')?.textContent,
    power: card.querySelector('p')?.textContent,
    price: uiText('За запитом', 'On request')
  };
}
publicEquipment?.addEventListener('click', event => {
  const card = event.target.closest('.equipment-public-grid .equipment-card, .equipment-public-grid article');
  if (!card || !publicEquipment.contains(card)) return;
  openEquipment(equipmentFromCard(card));
});
publicEquipment?.addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const card = event.target.closest('.equipment-public-grid .equipment-card, .equipment-public-grid article');
  if (!card || !publicEquipment.contains(card)) return;
  event.preventDefault();
  openEquipment(equipmentFromCard(card));
});
async function loadPublicEquipment() {
  if (!publicEquipment) return;
  publicEquipment.innerHTML = loadingMarkup(uiText('Завантажуємо обладнання…', 'Loading equipment…'));
  const data = await apiList('equipment');
  if (!Array.isArray(data) || !data.length) {
    publicEquipment.innerHTML = emptyMarkup(uiText('Асортимент оновлюється', 'The range is being updated'), uiText('Моделі стануть доступними після перевірки та схвалення нашими фахівцями.', 'Models will become available after review and approval by our specialists.')); return;
  }
  equipmentData = homepageEquipmentOrder(data);
  applyEquipmentFilters();
}
function closeEquipmentDialog() {
  if (!equipmentDialog) return;
  if (typeof equipmentDialog.close === 'function') equipmentDialog.close();
  else {
    equipmentDialog.removeAttribute('open');
    unlockEquipmentPage();
  }
}
$('.equipment-dialog-close')?.addEventListener('click', closeEquipmentDialog);
equipmentDialog?.addEventListener('click', event => { if (event.target === equipmentDialog) equipmentDialog.close(); });
equipmentDialog?.addEventListener('close', () => {
  if (!equipmentRestoreScroll) return;
  unlockEquipmentPage();
});
loadPublicEquipment();

async function loadCatalogExtension(collection, selector, limit) {
  const root = $(selector);
  if (!root) return;
  root.innerHTML = loadingMarkup(uiText('Завантажуємо каталог…', 'Loading catalogue…'));
  const data = await apiList(collection);
  if (!Array.isArray(data) || !data.length) {
    root.innerHTML = emptyMarkup(uiText('Розділ оновлюється', 'This section is being updated'), uiText('Перевірені позиції з’являться після схвалення фахівцями.', 'Verified products will appear after specialist approval.'));
    return;
  }
  const items = data.slice(0, limit).map(item => ({...item, _collection:collection}));
  root.innerHTML = items.map(item => {
    const image = item.thumbnail || item.images?.[0] || (collection === 'solarPanels' ? '/assets/catalog/solar-panel.svg' : '/assets/catalog/green-protect.svg');
    const specs = [item.power || item.spec, item.technology || item.category].filter(Boolean).join(' · ');
    return `<button class="catalog-extension-card" type="button" data-id="${escapeHtml(String(item._id))}"><img src="${escapeHtml(image)}" alt="${escapeHtml(`${item.brand || ''} ${item.model || item.name || ''}`.trim())}" loading="lazy"><span><small>${escapeHtml(item.brand || 'ETI')}</small><strong>${escapeHtml(item.model || item.name || '')}</strong><em>${escapeHtml(specs)}</em><b>${escapeHtml(equipmentPriceLabel(item))}</b></span></button>`;
  }).join('');
  $$('.catalog-extension-card', root).forEach(button => button.addEventListener('click', () => openEquipment(items.find(item => String(item._id) === button.dataset.id))));
  enhanceClickableHints(root);
}
loadCatalogExtension('solarPanels', '#public-solar-panels', 8);
loadCatalogExtension('greenProtect', '#public-green-protect', 8);

// Journal from API
const articleGrid = $('.article-grid');
function renderArticleCard(article, index) {
  const url = article.url || `/articles/${article.slug || article._id}.html`;
  const lead = index === 0 ? ' article-lead' : '';
  const number = String(index + 1).padStart(2, '0');
  const title = localizedContent(article, 'title');
  const excerpt = localizedContent(article, 'excerpt');
  const rawCategory = localizedContent(article, 'category', uiText('ЖУРНАЛ', 'JOURNAL'));
  const categoryTranslations = { Практика:'Practical guide', Сонце:'Solar', Гід:'Guide', Журнал:'Journal', ЖУРНАЛ:'JOURNAL' };
  const category = pageLang() === 'en' ? categoryTranslations[rawCategory] || rawCategory : rawCategory;
  return `<a class="article-card${lead} reveal visible" href="${escapeHtml(url)}"><span>${escapeHtml(category)} · ${index === 0 ? '9' : '5'} ${escapeHtml(uiText('ХВ', 'MIN'))}</span>${index === 0 ? `<div class="article-visual"><b>10</b><i>ms</i><small>${uiText('час, якого ви<br>не помітите', 'time you will<br>not notice')}</small></div>` : `<div class="article-number">${number}</div>`}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(excerpt)}</p><strong>${escapeHtml(uiText('Читати статтю ↗', 'Read article ↗'))}</strong></a>`;
}
async function loadArticles() {
  articleGrid.innerHTML = loadingMarkup(uiText('Завантажуємо журнал…', 'Loading journal…'));
  const data = await apiList('articles');
  if (Array.isArray(data) && data.length) {
    articleGrid.innerHTML = data.slice(0, 12).map(renderArticleCard).join('');
    enhanceClickableHints(articleGrid);
  } else articleGrid.innerHTML = emptyMarkup(uiText('Журнал заповнюється', 'The journal is being updated'), uiText('Нові матеріали вже готуються до публікації.', 'New articles are already being prepared for publication.'));
}
loadArticles();

// Compact community board from API
const topicList = $('.topic-list');
let topicFitFrame = 0;
function scheduleTopicViewportFit() {
  cancelAnimationFrame(topicFitFrame);
  topicFitFrame = requestAnimationFrame(() => fitQuestionViewport(topicList));
}
window.addEventListener('resize', scheduleTopicViewportFit, { passive: true });
document.fonts?.ready?.then(scheduleTopicViewportFit).catch(() => {});
function bindTopicVotes(root = document) {
  $$('.topic-votes button', root).forEach(button => button.addEventListener('click', () => {
    if (button.classList.contains('voted')) return;
    button.classList.add('voted');
    const value = button.parentElement.querySelector('strong');
    value.textContent = Number(value.textContent) + 1;
  }));
}

function toggleTopicAnswer(card, title, copy) {
  if (!card || !copy) return;
  const current = $('.topic-inline-answer', card);
  if (current) {
    current.remove();
    fitQuestionViewport();
    return;
  }
  $$('.topic-inline-answer', topicList).forEach(answer => answer.remove());
  const panel = document.createElement('div');
  panel.className = 'topic-inline-answer';
  panel.innerHTML = `<button type="button" aria-label="${escapeHtml(uiText('Закрити відповідь', 'Close answer'))}">×</button><span>${escapeHtml(uiText('Відповіді Енергокола', 'Energy Circle answers'))}</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(copy)}</p>`;
  $('.topic-answers', card)?.insertAdjacentElement('afterend', panel);
  $('button', panel).addEventListener('click', () => {
    panel.remove();
    fitQuestionViewport();
  });
  fitQuestionViewport();
}

function renderTopicCard(question, isNew = false) {
  const answered = question.status === 'answered' || (question.answers || []).length > 0;
  const firstAnswer = (question.answers || [])[0] || {};
  const answer = localizedContent(firstAnswer, 'text');
  const questionTitle = localizedContent(question, 'title');
  const questionBody = localizedContent(question, 'body');
  const article = document.createElement('article');
  article.className = `topic-card${isNew ? ' is-new' : ''}`;
  const discussionUrl = `${communityHref()}#${encodeURIComponent(String(question._id || ''))}`;
  const answerCount = (question.answers || []).length;
  const answerWord = pageLang() === 'en' ? (answerCount === 1 ? 'answer' : 'answers') : answerCount === 1 ? 'відповідь' : answerCount >= 2 && answerCount <= 4 ? 'відповіді' : 'відповідей';
  const answerHint = answerCount ? uiText(`Відкрити ${answerCount} ${answerWord} та продовжити обговорення`, `Open ${answerCount} ${answerWord} and continue the discussion`) : uiText('Відповідей ще немає — відкрийте обговорення, щоб відповісти першим', 'No answers yet — open the discussion and be the first to reply');
  const voteHint = uiText('Позначити питання корисним — лічильник збільшиться на один', 'Mark this question as useful — the counter will increase by one');
  article.innerHTML = `<div class="topic-metrics"><div class="topic-votes"><button type="button" aria-label="${escapeHtml(voteHint)}" data-hint="${escapeHtml(voteHint)}">♥</button><strong>${Number(question.likes || 0)}</strong><small>${escapeHtml(uiText('корисно', 'useful'))}</small></div><a class="topic-answer-count" href="${discussionUrl}" aria-label="${escapeHtml(answerHint)}" data-hint="${escapeHtml(answerHint)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4V5Z"/></svg><strong>${answerCount}</strong><small>${escapeHtml(uiText('відпов.', 'answers'))}</small></a></div><div><span class="topic-state ${answered ? 'answered' : ''}">${escapeHtml(answered ? uiText('Є ВІДПОВІДІ', 'ANSWERED') : uiText('ОБГОВОРЕННЯ', 'DISCUSSION'))}</span><h3>${escapeHtml(questionTitle)}</h3><p>${escapeHtml(answer || questionBody || uiText('Питання збережено в базі. Інженер відповість якнайшвидше.', 'The question has been saved. An engineer will reply as soon as possible.'))}</p>${answered ? `<button class="topic-answers" type="button" data-answer="${escapeHtml(answer)}">${escapeHtml(uiText('Переглянути відповіді ↓', 'View answers ↓'))}</button>` : ''}<a class="topic-answers topic-reply-link" href="${discussionUrl}">${escapeHtml(uiText('Відповісти на питання →', 'Answer this question →'))}</a><footer>${escapeHtml(question.author || uiText('Гість', 'Guest'))} · ${escapeHtml(question.city || uiText('Україна', 'Ukraine'))} <span>${answerCount ? `${answerCount} ${answerWord}` : uiText('очікує відповіді', 'awaiting an answer')}</span></footer></div>`;
  bindTopicVotes(article);
  const answerButton = $('.topic-answers[data-answer]', article);
  if (answerButton) answerButton.addEventListener('click', () => toggleTopicAnswer(article, $('h3', article).textContent, answerButton.dataset.answer));
  return article;
}
let faqPage = 1;
let faqItems = [];
const FAQ_PAGE_SIZE = 5;
function renderFaqPage() {
  const accordion = $('.accordion');
  const pagination = $('.faq-pagination');
  const pages = Math.max(1, Math.ceil(faqItems.length / FAQ_PAGE_SIZE));
  faqPage = Math.min(Math.max(1, faqPage), pages);
  const faqs = faqItems.slice((faqPage - 1) * FAQ_PAGE_SIZE, faqPage * FAQ_PAGE_SIZE);
  const reservedRows = Math.max(0, FAQ_PAGE_SIZE - faqs.length);
  accordion.innerHTML = `${faqs.map((item, index) => `<button class="faq-question" type="button" data-api-faq="${index}"><span>${escapeHtml(localizedContent(item, 'question'))}</span><i>↓</i></button>`).join('')}${Array.from({ length: reservedRows }, () => '<div class="faq-question-placeholder" aria-hidden="true"></div>').join('')}`;
  const pageButtons = Array.from({length:pages},(_,index)=>index+1).map(page => `<button type="button" data-faq-page="${page}" class="${page===faqPage?'is-current':''}" aria-label="${escapeHtml(uiText('Сторінка', 'Page'))} ${page}">${page}</button>`).join('');
  pagination.innerHTML = `<button type="button" data-faq-nav="first" ${faqPage===1?'disabled':''} aria-label="${escapeHtml(uiText('Перша сторінка', 'First page'))}">«</button><button type="button" data-faq-nav="prev" ${faqPage===1?'disabled':''} aria-label="${escapeHtml(uiText('Попередня сторінка', 'Previous page'))}">‹</button>${pageButtons}<button type="button" data-faq-nav="next" ${faqPage===pages?'disabled':''} aria-label="${escapeHtml(uiText('Наступна сторінка', 'Next page'))}">›</button><button type="button" data-faq-nav="last" ${faqPage===pages?'disabled':''} aria-label="${escapeHtml(uiText('Остання сторінка', 'Last page'))}">»</button>`;
  const faqSchema = $('#faq-schema');
  if (faqSchema) faqSchema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: localizedContent(item, 'question'),
      acceptedAnswer: { '@type': 'Answer', text: localizedContent(item, 'answer') }
    }))
  });
  $$('.faq-question', accordion).forEach((button, index) => {
    const item = faqs[index];
    button.addEventListener('click', () => openAnswer(localizedContent(item, 'question'), localizedContent(item, 'answer')));
  });
  enhanceClickableHints(accordion);
  $$('[data-faq-page]', pagination).forEach(button => button.addEventListener('click', () => { faqPage = Number(button.dataset.faqPage); renderFaqPage(); }));
  $$('[data-faq-nav]', pagination).forEach(button => button.addEventListener('click', () => { faqPage = button.dataset.faqNav === 'first' ? 1 : button.dataset.faqNav === 'last' ? pages : faqPage + (button.dataset.faqNav === 'prev' ? -1 : 1); renderFaqPage(); }));
}
async function loadFaqs() {
  const accordion = $('.accordion');
  accordion.innerHTML = loadingMarkup(uiText('Завантажуємо питання…', 'Loading questions…'));
  const data = await apiList('faqs');
  faqItems = Array.isArray(data) ? data.filter(item => item.status === 'active').sort((a, b) => Number(a.order || 0) - Number(b.order || 0)) : [];
  if (!faqItems.length) { accordion.innerHTML = emptyMarkup(uiText('Питань поки немає', 'No questions yet'), uiText('Поставте своє питання в Енергоколі.', 'Ask your question in the Energy Circle.')); $('.faq-pagination').innerHTML = ''; return; }
  faqPage = 1; renderFaqPage();
}
async function loadTopics() {
  topicList.innerHTML = loadingMarkup(uiText('Завантажуємо питання…', 'Loading questions…'));
  const data = await apiList('questions');
  if (!Array.isArray(data) || !data.length) { topicList.innerHTML = emptyMarkup(uiText('Питань поки немає', 'No questions yet'), uiText('Поставте перше питання — інженер відповість якнайшвидше.', 'Ask the first question — an engineer will reply as soon as possible.')); return; }
  topicList.innerHTML = '';
  data.slice(0, 8).forEach(question => topicList.append(renderTopicCard(question)));
  scheduleTopicViewportFit();
  enhanceClickableHints(topicList);
}
bindTopicVotes();
loadTopics();
loadFaqs();
syncLocalizedLinks();
window.addEventListener('ink:languagechange', event => {
  const languageChanged = Boolean(event.detail?.lang && event.detail.lang !== activeRuntimeLanguage);
  activeRuntimeLanguage = event.detail?.lang || pageLang();
  syncLocalizedLinks();
  updateSectionJumpTranslations();
  enhanceClickableHints();
  updateCalculator();
  const gridOn = simulator.classList.contains('is-on');
  $('.grid-label').textContent = gridOn ? uiText('Є', 'ON') : uiText('НЕМАЄ', 'OFF');
  $('.outage-label').textContent = gridOn ? uiText('СТАБІЛЬНА', 'STABLE') : 'OFFLINE';
  $('.grid-status').lastChild.textContent = gridOn ? uiText(' Система активна', ' System active') : uiText(' Резерв активний', ' Backup active');
  if (!languageChanged) return;
  resetSelector();
  loadReviews();
  loadProjects();
  loadPublicEquipment();
  loadArticles();
  loadTopics();
  loadFaqs();
});
window.addEventListener('load', () => {
  if (!location.hash) return;
  window.setTimeout(alignLocationHash, 80);
  window.setTimeout(alignLocationHash, 700);
  window.setTimeout(alignLocationHash, 1500);
  window.setTimeout(alignLocationHash, 2600);
});
$('#topic-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#topic-input');
  if (!input.value.trim()) return;
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit?.classList.add('is-sending');
  if (submit) submit.disabled = true;
  const response = await fetch('/api/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({author:'Гість',city:'',title:input.value.trim(),website:event.currentTarget.elements.website?.value || ''}) }).catch(() => null);
  submit?.classList.remove('is-sending');
  if (submit) submit.disabled = false;
  if (!response?.ok) return;
  const question = await response.json();
  topicList.prepend(renderTopicCard(question, true));
  scheduleTopicViewportFit();
  enhanceClickableHints(topicList.firstElementChild || topicList);
  input.value = '';
});

// Consultation form → API/CRM.
const consultationForm = $('#lead-form');
consultationForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const form = event.currentTarget;
  const fields = new FormData(form);
  const payload = Object.fromEntries(fields.entries());
  const submit = form.querySelector('.submit-button');
  submit.disabled = true;
  submit.classList.add('is-sending');
  submit.innerHTML = uiText('Надсилаємо…', 'Sending…');
  const response = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).catch(() => null);
  submit.disabled = false;
  submit.classList.remove('is-sending');
  submit.innerHTML = uiText('Надіслати запит <span>↗</span>', 'Send request <span>↗</span>');
  if (!response?.ok) { submit.innerHTML = uiText('Не вдалося. Повторити <span>↻</span>', 'Could not send. Retry <span>↻</span>'); return; }
  event.currentTarget.classList.add('submitted');
});
consultationForm.addEventListener('reset', () => {
  consultationForm.classList.remove('submitted');
  const submit = consultationForm.querySelector('.submit-button');
  submit.disabled = false;
  submit.innerHTML = uiText('Надіслати запит <span>↗</span>', 'Send request <span>↗</span>');
});
$('.form-success-reset', consultationForm)?.addEventListener('click', () => consultationForm.reset());

// Three-step system selector
const dialog = $('#selector-dialog');
const selectorContent = $('.selector-content', dialog);
const answers = [];
const selectorStartMarkup = () => `<p class="eyebrow">${escapeHtml(uiText('AI-підбір / 01', 'AI selection / 01'))}</p><h2>${escapeHtml(uiText('Де потрібна енергія?', 'Where do you need power?'))}</h2><div class="selector-options"><button type="button" data-answer="apartment">${escapeHtml(uiText('Квартира', 'Apartment'))} <span>→</span></button><button type="button" data-answer="house">${escapeHtml(uiText('Приватний будинок', 'Private house'))} <span>→</span></button><button type="button" data-answer="business">${escapeHtml(uiText('Бізнес', 'Business'))} <span>→</span></button></div><p class="selector-hint">${escapeHtml(uiText('3 питання · близько 90 секунд', '3 questions · about 90 seconds'))}</p>`;
const selectorSteps = () => [
  { eyebrow: uiText('AI-підбір / 02', 'AI selection / 02'), title: uiText('Що має працювати?', 'What must keep working?'), options: [['essential', uiText('Базові прилади', 'Essential appliances')], ['all', uiText('Увесь об’єкт', 'The whole property')], ['critical', uiText('Критичні лінії бізнесу', 'Critical business circuits')]] },
  { eyebrow: uiText('AI-підбір / 03', 'AI selection / 03'), title: uiText('Ваш пріоритет?', 'What is your priority?'), options: [['autonomy', uiText('Максимум автономності', 'Maximum autonomy')], ['budget', uiText('Оптимальний бюджет', 'Optimised budget')], ['solar', uiText('Можливість додати сонце', 'Solar-ready')]] }
];
const selectorResults = () => ({
  Base: {
    model: 'Base',
    title: uiText('Вам пасує система Base.', 'The Base system fits your needs.'),
    badge: '4.2 kW · 2.5 kWh',
    object: uiText('Квартира', 'Apartment'),
    need: 'backup',
    copy: uiText('Для квартири або компактного будинку: світло, Wi‑Fi, холодильник, котел і базова техніка без переплати за зайвий резерв.', 'For an apartment or compact home: lighting, Wi-Fi, refrigerator, boiler and essential appliances without paying for unnecessary reserve.')
  },
  Pulse: {
    model: 'Pulse',
    title: uiText('Вам пасує система Pulse.', 'The Pulse system fits your needs.'),
    badge: '6 kW · 5 kWh',
    object: uiText('Приватний будинок', 'Private house'),
    need: 'full',
    copy: uiText('Для приватного будинку, де мають працювати насос, котел, кухня, зв’язок і комфортні побутові сценарії під час відключень.', 'For a private house where the pump, boiler, kitchen, connectivity and everyday comforts must keep working during outages.')
  },
  Shift: {
    model: 'Shift',
    title: uiText('Вам пасує система Shift.', 'The Shift system fits your needs.'),
    badge: '12 kW · 10 kWh',
    object: uiText('Магазин / ресторан', 'Shop / restaurant'),
    need: 'full',
    copy: uiText('Для бізнесу: каса, холодильники, освітлення, мережеве обладнання та критичні лінії, які не можна зупиняти.', 'For business: checkout, refrigeration, lighting, network equipment and critical circuits that cannot stop.')
  },
  Orbit: {
    model: 'Orbit',
    title: uiText('Вам пасує система Orbit.', 'The Orbit system fits your needs.'),
    badge: '15 kW · 20 kWh',
    object: uiText('Інше', 'Other'),
    need: 'solar',
    copy: uiText('Для максимальної автономності, нестабільної мережі або сценарію з сонячними панелями та запасом на масштабування.', 'For maximum autonomy, an unstable grid or a solar scenario with room to expand.')
  }
});
function getSelectorResult() {
  const [place = '', load = '', priority = ''] = answers;
  const results = selectorResults();
  if (place === 'business' || load === 'critical') return results.Shift;
  if (priority === 'autonomy' || priority === 'solar') return results.Orbit;
  if (place === 'apartment' && load === 'essential') return results.Base;
  if (priority === 'budget' && load === 'essential') return results.Base;
  return results.Pulse;
}
function prefillSelectorLead(result) {
  const form = $('#lead-form');
  if (!form) return;
  const object = form.elements.object;
  const need = form.querySelector(`input[name="need"][value="${result.need}"]`);
  const comment = form.elements.comment;
  if (object) object.value = result.object;
  if (need) need.checked = true;
  if (comment) {
    comment.value = uiText(`AI-підбір рекомендував ${result.model} (${result.badge}). Прошу зробити точний розрахунок під мій об'єкт.`, `AI selection recommended ${result.model} (${result.badge}). Please prepare an exact calculation for my property.`);
  }
}
function bindSelectorOptions(root = dialog) {
  $$('.selector-options button', root).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, 1), { once:true }));
}
function resetSelector() {
  answers.length = 0;
  selectorContent.innerHTML = selectorStartMarkup();
  $('.selector-progress i', dialog).style.width = '33%';
  bindSelectorOptions(selectorContent);
  enhanceClickableHints(selectorContent);
}
function openSelector() {
  resetSelector();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}
function renderStep(stepIndex) {
  const step = selectorSteps()[stepIndex];
  $('.selector-progress i', dialog).style.width = `${(stepIndex + 2) * 33.34}%`;
  selectorContent.innerHTML = `<p class="eyebrow">${escapeHtml(step.eyebrow)}</p><h2>${escapeHtml(step.title)}</h2><div class="selector-options">${step.options.map(([value, label]) => `<button type="button" data-answer="${escapeHtml(value)}">${escapeHtml(label)}<span>→</span></button>`).join('')}</div><p class="selector-hint">${escapeHtml(uiText('Підбираємо архітектуру, а не окрему коробку', 'We select an architecture, not just a box'))}</p>`;
  $$('.selector-options button', selectorContent).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, stepIndex + 2), { once:true }));
  enhanceClickableHints(selectorContent);
}
function handleAnswer(answer, nextStep) {
  answers.push(answer);
  if (nextStep < 3) return renderStep(nextStep - 1);
  const result = getSelectorResult();
  selectorContent.innerHTML = `<p class="eyebrow">${escapeHtml(uiText('Результат / ІНК', 'Result / INK'))} · ${escapeHtml(result.badge)}</p><h2>${escapeHtml(result.title)}</h2><p style="color:var(--muted)">${escapeHtml(result.copy)}</p><a class="button button-primary" href="#consultation" id="selector-result">${escapeHtml(uiText('Отримати точний розрахунок', 'Get an exact calculation'))} <span>↗</span></a>`;
  $('#selector-result').addEventListener('click', () => {
    prefillSelectorLead(result);
    dialog.close();
    $('#consultation')?.scrollIntoView({ behavior: 'smooth' });
  });
  enhanceClickableHints(selectorContent);
}
$$('.js-open-selector').forEach(button => button.addEventListener('click', openSelector));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
bindSelectorOptions(dialog);

// FAQ answers open above the layout and never shift surrounding sections.
const answerDialog = $('#answer-dialog');
let answerReturnY = 0;
const faqAnswers = [
  'Потужність визначаємо за сумарним навантаженням і пусковими струмами. Для базових потреб часто достатньо 4–6 кВт, але насос, кондиціонер чи електроплита змінюють розрахунок.',
  'Залежить від ємності та навантаження. Батарея 5 кВт·год дає орієнтовно 8–10 годин для базових приладів із навантаженням близько 400 Вт.',
  'Так. Гібридна архітектура дозволяє почати з інвертора та батареї, а панелі підключити пізніше без перебудови системи.',
  'Так. Проєктуємо одно- й трифазні системи з пріоритетом кас, серверів, холодильного обладнання, освітлення та зв’язку.',
  'Ціна залежить від потужності інвертора, ємності батареї, автоматики та монтажу. Точний кошторис формуємо після карти навантажень.',
  'Так. Безпечне підключення потребує проєкту, захисту, правильного перерізу кабелів і налаштування автоматики.'
];
function restoreAnswerScroll() {
  window.scrollTo({ top: answerReturnY, left: window.scrollX, behavior: 'auto' });
}
function openAnswer(title, copy) {
  answerReturnY = window.scrollY;
  $('h2', answerDialog).textContent = title;
  $('.answer-dialog-copy', answerDialog).textContent = copy;
  if (typeof answerDialog.showModal === 'function') answerDialog.showModal();
  else answerDialog.setAttribute('open', '');
  requestAnimationFrame(restoreAnswerScroll);
  window.setTimeout(restoreAnswerScroll, 40);
  window.setTimeout(restoreAnswerScroll, 140);
}
$$('.faq-question').forEach(button => button.addEventListener('click', () => openAnswer($('span', button).textContent, faqAnswers[Number(button.dataset.faq)])));
const topicAnswerCopy = { q1:'Так, якщо модель батареї підтримує паралельне масштабування, напруга однакова та сумісний протокол BMS. Перед підключенням інженер вирівнює заряд модулів.', q3:'Частина ємності залишається як захисний резерв, ще частина втрачається на перетворенні. Для попереднього розрахунку закладайте 80–88% корисної енергії.' };
$$('.topic-answers[data-question]').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.topic-card');
  toggleTopicAnswer(card, card.querySelector('h3').textContent, topicAnswerCopy[button.dataset.question]);
}));
$('.answer-dialog-close').addEventListener('click', () => answerDialog.close());
answerDialog.addEventListener('click', event => { if (event.target === answerDialog) answerDialog.close(); });
answerDialog.addEventListener('close', () => requestAnimationFrame(restoreAnswerScroll));

setupScrollHud('.article-grid', 'x');
setupScrollHud('.topic-list', 'y');

// A compact section directory is available from the top-right corner of every content section.
const quickSectionItems = [
  ['systems', 'Енергосистема', 'Energy system'],
  ['inverters', 'Інвертори', 'Inverters'],
  ['equipment', 'Обладнання', 'Equipment'],
  ['calculator', 'Калькулятор', 'Calculator'],
  ['kits', 'Готові системи', 'System packages'],
  ['solutions', 'Рішення', 'Solutions'],
  ['compare', 'Порівняння', 'Comparison'],
  ['technology', 'Технології', 'Technology'],
  ['projects', 'Об’єкти', 'Projects'],
  ['reviews', 'Відгуки', 'Reviews'],
  ['journal', 'Журнал', 'Journal'],
  ['energy-circle', 'Енергоколо', 'Community'],
  ['faq', 'Питання та відповіді', 'FAQ'],
  ['consultation', 'Надіслати запит', 'Send an enquiry'],
  ['contacts', 'Контакти', 'Contacts']
];
function syncSectionJumpTriggerState(trigger, pinned = false) {
  if (!trigger) return;
  const hint = pinned
    ? uiText('Меню закріплено · натисніть, щоб закрити', 'Menu pinned · click to close')
    : uiText('Наведіть, щоб відкрити · натисніть, щоб закріпити меню', 'Hover to open · click to pin the menu');
  trigger.dataset.hint = hint;
  trigger.dataset.hintExplicit = 'true';
  trigger.setAttribute('aria-label', hint);
  trigger.setAttribute('aria-pressed', String(Boolean(pinned)));
}
function closeSectionJumpMenus(except = null) {
  $$('.section-jump.is-open').forEach(menu => {
    if (menu === except) return;
    menu.classList.remove('is-open');
    const trigger = $('.section-jump-trigger', menu);
    trigger?.setAttribute('aria-expanded', 'false');
    syncSectionJumpTriggerState(trigger, false);
  });
}
function setupSectionJumpMenus() {
  const availableItems = quickSectionItems.filter(([id]) => document.getElementById(id));
  const links = (currentId) => availableItems.map(([id, uk, en]) => `<a href="#${id}" ${id === currentId ? 'aria-current="location"' : ''}><span>${escapeHtml(uiText(uk, en))}</span><i>↗</i></a>`).join('');
  availableItems.forEach(([id]) => {
    const section = document.getElementById(id);
    if (!section || $('.section-jump', section)) return;
    const jump = document.createElement('nav');
    jump.className = 'section-jump';
    jump.setAttribute('aria-label', uiText('Швидкий перехід між розділами', 'Quick section navigation'));
    jump.innerHTML = `<button class="section-jump-trigger" type="button" aria-expanded="false" aria-pressed="false" aria-label="${escapeHtml(uiText('Відкрити меню розділів', 'Open section menu'))}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 18 18 6M9 6h9v9"/></svg></button><div class="section-jump-menu"><strong>${escapeHtml(uiText('Перейти до розділу', 'Go to section'))}</strong><a class="section-jump-top" href="#top"><span>${escapeHtml(uiText('На початок сторінки', 'Back to top'))}</span><i>↑</i></a>${links(id)}</div>`;
    section.append(jump);
    const trigger = $('.section-jump-trigger', jump);
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      const willOpen = !jump.classList.contains('is-open');
      closeSectionJumpMenus(jump);
      jump.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
      syncSectionJumpTriggerState(trigger, willOpen);
    });
    $$('.section-jump-menu a', jump).forEach(link => link.addEventListener('click', () => closeSectionJumpMenus()));
  });
  document.addEventListener('click', event => { if (!event.target.closest('.section-jump')) closeSectionJumpMenus(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSectionJumpMenus(); });
}
setupSectionJumpMenus();

function updateSectionJumpTranslations() {
  const availableItems = quickSectionItems.filter(([id]) => document.getElementById(id));
  const links = currentId => availableItems.map(([id, uk, en]) => `<a href="#${id}" ${id === currentId ? 'aria-current="location"' : ''}><span>${escapeHtml(uiText(uk, en))}</span><i>↗</i></a>`).join('');
  $$('.section-jump').forEach(jump => {
    const currentId = jump.parentElement?.id || '';
    jump.setAttribute('aria-label', uiText('Швидкий перехід між розділами', 'Quick section navigation'));
    const trigger = $('.section-jump-trigger', jump);
    syncSectionJumpTriggerState(trigger, jump.classList.contains('is-open'));
    const menu = $('.section-jump-menu', jump);
    if (!menu) return;
    menu.innerHTML = `<strong>${escapeHtml(uiText('Перейти до розділу', 'Go to section'))}</strong><a class="section-jump-top" href="#top"><span>${escapeHtml(uiText('На початок сторінки', 'Back to top'))}</span><i>↑</i></a>${links(currentId)}`;
    $$('a', menu).forEach(link => link.addEventListener('click', () => closeSectionJumpMenus()));
  });
}

document.addEventListener('click', event => {
  const topLink = event.target.closest('a[href="#top"]');
  if (!topLink) return;
  event.preventDefault();
  closeSectionJumpMenus();
  history.replaceState(null, '', `${location.pathname}${location.search}#top`);
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
});

// Keep the header state tied to the section currently passing through the reading line.
const sectionNavLinks = $$('.site-header .desktop-nav a[href^="#"]');
const sectionNavTargets = sectionNavLinks
  .map(link => ({ link, section: document.querySelector(link.hash) }))
  .filter(item => item.section);
let sectionNavFrame = 0;
function updateSectionNavigation() {
  sectionNavFrame = 0;
  const readingLine = window.innerHeight * .34;
  const active = sectionNavTargets.find(item => {
    const rect = item.section.getBoundingClientRect();
    return rect.top <= readingLine && rect.bottom > readingLine;
  }) || null;
  sectionNavLinks.forEach(link => {
    const selected = Boolean(active && link === active.link);
    link.classList.toggle('is-active', selected);
    if (selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function requestSectionNavigationUpdate() {
  if (!sectionNavFrame) sectionNavFrame = requestAnimationFrame(updateSectionNavigation);
}
sectionNavLinks.forEach(link => link.addEventListener('click', () => {
  sectionNavLinks.forEach(item => item.classList.toggle('is-active', item === link));
}));
window.addEventListener('scroll', requestSectionNavigationUpdate, { passive: true });
window.addEventListener('resize', requestSectionNavigationUpdate);
updateSectionNavigation();
enhanceClickableHints();

// Cached sections paint immediately. When a lightweight ETag check detects
// newer CRM content, refresh only the affected block without reloading page.
window.addEventListener('voltares:collection-updated', event => {
  const loaders = {
    reviews:loadReviews,
    projects:loadProjects,
    equipment:loadPublicEquipment,
    solarPanels:() => loadCatalogExtension('solarPanels', '#public-solar-panels', 8),
    greenProtect:() => loadCatalogExtension('greenProtect', '#public-green-protect', 8),
    articles:loadArticles,
    questions:loadTopics,
    faqs:loadFaqs
  };
  loaders[event.detail?.type]?.();
});
