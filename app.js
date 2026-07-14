const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const pageLang = () => new URLSearchParams(location.search).get('lang') || localStorage.getItem('ink-lang') || 'uk';
const uiText = (uk, en) => pageLang() === 'en' ? en : uk;
const communityHref = () => pageLang() === 'en' ? '/community.html?lang=en' : '/community.html';
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
const apiList = async type => {
  if (pageLang() !== 'uk' && ['reviews', 'projects', 'articles', 'questions', 'faqs'].includes(type)) return null;
  updateSiteLoading(1);
  try {
    const response = await fetch(`/api/${type}`).catch(() => null);
    return response?.ok ? response.json() : null;
  } finally {
    updateSiteLoading(-1);
  }
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
  const noHintSelector = '.dialog-close,.answer-dialog-close,.project-dialog-close,.equipment-dialog-close,.equipment-more-toggle,.gallery-dialog button[aria-label="Закрити"],.site-header .desktop-nav a,.site-header .button-small';
  $$(noHintSelector, root).forEach(element => {
    delete element.dataset.hint;
    element.removeAttribute('title');
  });
  const explicitHints = [
    ['.theme-toggle', 'Перемкнути світлу / темну тему'],
    ['.menu-toggle', 'Відкрити меню сайту'],
    ['.phone', 'Показати всі телефони ІНК'],
    ['.phone-dropdown a', 'Подзвонити за цим номером'],
    ['.js-open-selector', 'Запустити швидкий підбір системи'],
    ['.review-prev', 'Показати попередні відгуки'],
    ['.review-next', 'Показати наступні відгуки'],
    ['.review-add', 'Додати свій відгук'],
    ['.project-prev', 'Гортати обʼєкти назад'],
    ['.project-next', 'Гортати обʼєкти вперед'],
    ['.project-open', 'Відкрити фото та паспорт обʼєкта'],
    ['.grid-simulator', 'Перемкнути стан мережі'],
    ['.appliance', 'Додати або прибрати прилад із розрахунку'],
    ['.brand-compare', 'Заповнити заявку з цим брендом'],
    ['.topic-votes button', 'Позначити питання корисним — лічильник збільшиться на один'],
    ['.topic-answer-count', 'Відкрити всі відповіді та продовжити обговорення'],
    ['.topic-answers[data-answer]', 'Показати першу відповідь у цій картці'],
    ['.topic-reply-link', 'Перейти до повного обговорення та залишити свою відповідь'],
    ['.faq-question', 'Відкрити відповідь без зміщення сторінки'],
    ['.submit-button', 'Надіслати заявку в CRM'],
    ['.lang-switch', 'Open English version'],
    ['.language-switcher button', 'Змінити мову сайту'],
    ['.circle-all-link', 'Перейти до всіх питань'],
    ['.floating-consult', 'Швидко перейти до консультації']
  ];
  explicitHints.forEach(([selector, hint]) => $$(selector, root).forEach(element => {
    if (element.matches(noHintSelector)) return;
    if (!element.dataset.hint) element.dataset.hint = hint;
    element.removeAttribute('title');
  }));
  $$('a,button,[role="button"]', root).forEach(element => {
    if (element.matches(noHintSelector)) return;
    if (element.dataset.hint) return;
    const label = element.getAttribute('aria-label') || element.title || element.textContent.trim().replace(/\s+/g, ' ');
    if (!label) return;
    const hint = label.length > 72 ? `${label.slice(0, 69)}…` : label;
    element.dataset.hint = hint;
    element.removeAttribute('title');
  });
}

function setupScrollHud(selector, axis = 'x') {
  const target = $(selector);
  if (!target || target.nextElementSibling?.classList.contains('scroll-hud')) return;
  const nav = document.createElement('div');
  nav.className = 'scroll-hud';
  nav.innerHTML = '<button type="button" aria-label="Гортати назад">←</button><button type="button" aria-label="Гортати вперед">→</button>';
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
  mobileNav.classList.toggle('is-open', open);
  mobileNav.setAttribute('aria-hidden', !open);
});
$$('.mobile-nav a').forEach(a => a.addEventListener('click', () => {
  mobileNav.classList.remove('is-open');
  mobileNav.setAttribute('aria-hidden', 'true');
  menuToggle.setAttribute('aria-expanded', 'false');
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
  $('.grid-label').textContent = on ? 'Є' : 'НЕМАЄ';
  $('.outage-label').textContent = on ? 'СТАБІЛЬНА' : 'OFFLINE';
  $('.grid-status').lastChild.textContent = on ? ' Система активна' : ' Резерв активний';
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
appliances.forEach(item => item.addEventListener('click', () => { item.classList.toggle('is-active'); updateCalculator(); }));
hours.addEventListener('input', updateCalculator);
updateCalculator();

// Kit filtering
$$('.kit-tabs button').forEach(button => button.addEventListener('click', () => {
  $$('.kit-tabs button').forEach(btn => btn.classList.remove('is-active'));
  button.classList.add('is-active');
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
  const badge = data.verified === true ? '<b>ПЕРЕВІРЕНИЙ ВІДГУК</b>' : '';
  article.innerHTML = `<div class="stars" aria-label="${rating} з 5">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><blockquote>«${escapeHtml(data.text || '')}»</blockquote>${reply ? `<div class="team-reply"><span>↳ ВІДПОВІДЬ ІНК</span><p>${escapeHtml(reply)}</p></div>` : ''}<footer><div class="avatar">${escapeHtml(initials)}</div><div><strong>${escapeHtml(data.name || 'Клієнт ІНК')}</strong><span>${escapeHtml(data.city || 'Україна')}</span></div>${badge}</footer>`;
  reviewTrack.append(article);
  reviews.push(article);
  return article;
}
async function loadReviews() {
  reviewTrack.innerHTML = loadingMarkup('Завантажуємо відгуки…');
  const data = await apiList('reviews');
  reviews.splice(0, reviews.length);
  if (!Array.isArray(data) || !data.length) { reviewTrack.innerHTML = emptyMarkup('Відгуків поки немає', 'Будьте першим, хто поділиться досвідом.'); return; }
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
  const data = { name: fields.get('reviewName'), city: fields.get('reviewCity'), rating: fields.get('reviewRating'), text: fields.get('reviewText') };
  const submit = reviewForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.classList.add('is-sending');
  submit.textContent = 'Публікуємо…';
  const response = await fetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).catch(() => null);
  submit.disabled = false;
  submit.classList.remove('is-sending');
  submit.textContent = 'Опублікувати відгук ↗';
  if (!response?.ok) { submit.textContent = 'Помилка. Спробуйте ще раз'; return; }
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
  comment.value = `Хочу порівняти ${button.dataset.brand} з іншими інверторами під мій об'єкт.`;
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
  const status = project.status === 'published' ? 'Опубліковано' : 'Активний';
  projectData.set(id, { image:project.image || '/assets/projects/home-backup.jpg', title:`${project.title} / ${project.city || 'Україна'}`, copy:project.description || 'Паспорт системи редагується в адмінці.', stats:[project.type || 'об’єкт', project.city || 'Україна', status] });
  return `<article class="project-card${large} reveal visible"><button type="button" class="project-open" data-project="${escapeHtml(id)}" aria-label="Відкрити об'єкт ${escapeHtml(project.title)}"><img src="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(project.title)}" loading="lazy"><span class="project-arrow">↗</span></button><div class="project-meta"><div><span>${escapeHtml(project.city || 'Україна')} · ${escapeHtml(project.type || 'об’єкт')} · ${status}</span><h3>${escapeHtml(project.title)}</h3></div><p>${escapeHtml(project.description || '')}</p></div></article>`;
}
async function loadProjects() {
  projectGrid.innerHTML = loadingMarkup('Завантажуємо об’єкти…');
  const data = await apiList('projects');
  if (!Array.isArray(data) || !data.length) { projectGrid.innerHTML = emptyMarkup('Географія оновлюється', 'Нові об’єкти з’являться після перевірки та схвалення технічним відділом.'); return; }
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
const equipmentItems = new Map();
let equipmentReturnY = 0;
let equipmentRestoreScroll = true;
let activeEquipmentItem = null;
let activeEquipmentBrand = 'all';
function applyEquipmentFilters() {
  const query = (equipmentSearch?.value || '').trim().toLocaleLowerCase();
  const cards = $$('.equipment-card', publicEquipment);
  const availableBrands = new Set(cards.map(card => (card.querySelector('span')?.textContent || '').trim().toLocaleLowerCase()));
  $$('.equipment-filter button').forEach(button => {
    const brand = button.dataset.brandFilter || 'all';
    button.hidden = brand !== 'all' && !availableBrands.has(brand);
  });
  if (activeEquipmentBrand !== 'all' && !availableBrands.has(activeEquipmentBrand)) {
    activeEquipmentBrand = 'all';
    $$('.equipment-filter button').forEach(button => button.classList.toggle('is-active', button.dataset.brandFilter === 'all'));
  }
  cards.forEach(card => {
    const brand = (card.querySelector('span')?.textContent || '').trim().toLocaleLowerCase();
    const haystack = card.textContent.toLocaleLowerCase();
    card.hidden = (activeEquipmentBrand !== 'all' && brand !== activeEquipmentBrand) || (query && !haystack.includes(query));
  });
}
equipmentSearch?.addEventListener('input', applyEquipmentFilters);
$$('.equipment-filter button').forEach(button => button.addEventListener('click', () => {
  activeEquipmentBrand = button.dataset.brandFilter || 'all';
  $$('.equipment-filter button').forEach(item => item.classList.toggle('is-active', item === button));
  applyEquipmentFilters();
}));
function renderPublicEquipment(item) {
  const status = item.status === 'active' ? 'Активний' : 'На перевірці';
  return `<button class="equipment-card reveal visible" type="button" data-equipment="${escapeHtml(String(item._id || item.model || ''))}" aria-label="Відкрити опис ${escapeHtml(item.brand || '')} ${escapeHtml(item.model || '')}"><span>${escapeHtml(item.brand || 'ІНК')}</span><h3>${escapeHtml(item.model || 'Модель')}</h3><p>${escapeHtml(item.power || '—')} · ${escapeHtml(item.phase || '—')} · ${escapeHtml(item.voltage || '—')}</p><b><i>${escapeHtml(status)}</i><em>Детальніше ↗</em></b></button>`;
}
function openEquipment(item) {
  if (!equipmentDialog || !item) return;
  activeEquipmentItem = item;
  equipmentReturnY = window.scrollY;
  equipmentRestoreScroll = true;
  const images = Array.isArray(item.images) && item.images.length ? item.images : [item.image || '/assets/projects/home-backup.jpg'];
  const image = images[0];
  const mainImage = $('img', equipmentDialog);
  mainImage.src = image;
  mainImage.alt = `${item.brand || ''} ${item.model || ''}`.trim();
  let gallery = $('.equipment-dialog-gallery', equipmentDialog);
  if (!gallery) {
    gallery = document.createElement('div');
    gallery.className = 'equipment-dialog-gallery';
    $('.eyebrow', equipmentDialog).insertAdjacentElement('beforebegin', gallery);
  }
  gallery.innerHTML = images.length > 1 ? images.map((src, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}" data-equipment-image="${escapeHtml(src)}" aria-label="Фото ${index + 1}"><img src="${escapeHtml(src)}" alt=""></button>`).join('') : '';
  $$('[data-equipment-image]', gallery).forEach(button => button.addEventListener('click', () => {
    mainImage.src = button.dataset.equipmentImage;
    $$('button', gallery).forEach(item => item.classList.toggle('is-active', item === button));
  }));
  $('h2', equipmentDialog).textContent = `${item.brand || 'ІНК'} ${item.model || ''}`.trim();
  $('.equipment-dialog-copy', equipmentDialog).textContent = item.description || 'Модель використовується в проєктних системах ІНК. Точну сумісність, комплектацію й ціну інженер підтвердить після карти навантажень.';
  $('[data-equipment-field="power"]', equipmentDialog).textContent = item.power || '—';
  $('[data-equipment-field="grid"]', equipmentDialog).textContent = [item.phase, item.voltage].filter(Boolean).join(' · ') || '—';
  $('[data-equipment-field="price"]', equipmentDialog).textContent = item.price || 'За запитом';
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
  if (typeof equipmentDialog.showModal === 'function') equipmentDialog.showModal();
  else equipmentDialog.setAttribute('open', '');
  requestAnimationFrame(() => window.scrollTo({ top: equipmentReturnY, left: window.scrollX, behavior: 'auto' }));
}

$('.equipment-more-toggle')?.addEventListener('click', event => {
  const button = event.currentTarget;
  const fields = $('.equipment-extra-fields', equipmentDialog);
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  fields.hidden = expanded;
  $('span', button).textContent = expanded ? '↓' : '↑';
});

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
    comment: [`Клієнт надіслав запит із картки моделі ${model}.`, fields.note ? `Нотатка клієнта: ${fields.note}` : '', 'Джерело: картка обладнання.'].filter(Boolean).join(' ')
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
    price: 'За запитом'
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
  publicEquipment.innerHTML = loadingMarkup('Завантажуємо обладнання…');
  const data = await apiList('equipment');
  if (!Array.isArray(data) || !data.length) {
    publicEquipment.innerHTML = emptyMarkup('Асортимент оновлюється', 'Моделі стануть доступними після перевірки та схвалення нашими фахівцями.'); return;
  }
  publicEquipment.innerHTML = data.slice(0, 9).map(renderPublicEquipment).join('');
  bindEquipmentCards(data.slice(0, 9));
  applyEquipmentFilters();
  enhanceClickableHints(publicEquipment);
}
function closeEquipmentDialog() {
  if (!equipmentDialog) return;
  if (typeof equipmentDialog.close === 'function') equipmentDialog.close();
  else equipmentDialog.removeAttribute('open');
}
$('.equipment-dialog-close')?.addEventListener('click', closeEquipmentDialog);
equipmentDialog?.addEventListener('click', event => { if (event.target === equipmentDialog) equipmentDialog.close(); });
equipmentDialog?.addEventListener('close', () => {
  if (!equipmentRestoreScroll) return;
  requestAnimationFrame(() => window.scrollTo({ top: equipmentReturnY, left: window.scrollX, behavior: 'auto' }));
});
loadPublicEquipment();

// Journal from API
const articleGrid = $('.article-grid');
function renderArticleCard(article, index) {
  const url = article.url || `/articles/${article.slug || article._id}.html`;
  const lead = index === 0 ? ' article-lead' : '';
  const number = String(index + 1).padStart(2, '0');
  return `<a class="article-card${lead} reveal visible" href="${escapeHtml(url)}"><span>${escapeHtml(article.category || 'ЖУРНАЛ')} · ${index === 0 ? '9' : '5'} ХВ</span>${index === 0 ? '<div class="article-visual"><b>10</b><i>ms</i><small>час, якого ви<br>не помітите</small></div>' : `<div class="article-number">${number}</div>`}<h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt || '')}</p><strong>Читати статтю ↗</strong></a>`;
}
async function loadArticles() {
  articleGrid.innerHTML = loadingMarkup('Завантажуємо журнал…');
  const data = await apiList('articles');
  if (Array.isArray(data) && data.length) {
    articleGrid.innerHTML = data.slice(0, 12).map(renderArticleCard).join('');
    enhanceClickableHints(articleGrid);
  } else articleGrid.innerHTML = emptyMarkup('Журнал заповнюється', 'Нові матеріали вже готуються до публікації.');
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
  panel.innerHTML = `<button type="button" aria-label="Закрити відповідь">×</button><span>Відповіді Енергокола</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(copy)}</p>`;
  $('.topic-answers', card)?.insertAdjacentElement('afterend', panel);
  $('button', panel).addEventListener('click', () => {
    panel.remove();
    fitQuestionViewport();
  });
  fitQuestionViewport();
}

function renderTopicCard(question, isNew = false) {
  const answered = question.status === 'answered' || (question.answers || []).length > 0;
  const answer = (question.answers || [])[0]?.text || '';
  const article = document.createElement('article');
  article.className = `topic-card${isNew ? ' is-new' : ''}`;
  const discussionUrl = `${communityHref()}#${encodeURIComponent(String(question._id || ''))}`;
  const answerCount = (question.answers || []).length;
  const answerWord = answerCount === 1 ? 'відповідь' : answerCount >= 2 && answerCount <= 4 ? 'відповіді' : 'відповідей';
  const answerHint = answerCount ? `Відкрити ${answerCount} ${answerWord} та продовжити обговорення` : 'Відповідей ще немає — відкрийте обговорення, щоб відповісти першим';
  article.innerHTML = `<div class="topic-metrics"><div class="topic-votes"><button type="button" aria-label="Позначити питання корисним" data-hint="Позначити питання корисним — лічильник збільшиться на один">♥</button><strong>${Number(question.likes || 0)}</strong><small>корисно</small></div><a class="topic-answer-count" href="${discussionUrl}" aria-label="${escapeHtml(answerHint)}" data-hint="${escapeHtml(answerHint)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4V5Z"/></svg><strong>${answerCount}</strong><small>відпов.</small></a></div><div><span class="topic-state ${answered ? 'answered' : ''}">${answered ? 'Є ВІДПОВІДІ' : 'ОБГОВОРЕННЯ'}</span><h3>${escapeHtml(question.title)}</h3><p>${escapeHtml(answer || question.body || 'Питання збережено в базі. Інженер відповість якнайшвидше.')}</p>${answered ? `<button class="topic-answers" type="button" data-answer="${escapeHtml(answer)}">Переглянути відповіді ↓</button>` : ''}<a class="topic-answers topic-reply-link" href="${discussionUrl}">Відповісти на питання →</a><footer>${escapeHtml(question.author || 'Гість')} · ${escapeHtml(question.city || 'Україна')} <span>${answerCount ? `${answerCount} ${answerWord}` : 'очікує відповіді'}</span></footer></div>`;
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
  accordion.innerHTML = `${faqs.map((item, index) => `<button class="faq-question" type="button" data-api-faq="${index}"><span>${escapeHtml(item.question)}</span><i>↓</i></button>`).join('')}${Array.from({ length: reservedRows }, () => '<div class="faq-question-placeholder" aria-hidden="true"></div>').join('')}`;
  const pageButtons = Array.from({length:pages},(_,index)=>index+1).map(page => `<button type="button" data-faq-page="${page}" class="${page===faqPage?'is-current':''}" aria-label="Сторінка ${page}">${page}</button>`).join('');
  pagination.innerHTML = `<button type="button" data-faq-nav="first" ${faqPage===1?'disabled':''} aria-label="Перша сторінка">«</button><button type="button" data-faq-nav="prev" ${faqPage===1?'disabled':''} aria-label="Попередня сторінка">‹</button>${pageButtons}<button type="button" data-faq-nav="next" ${faqPage===pages?'disabled':''} aria-label="Наступна сторінка">›</button><button type="button" data-faq-nav="last" ${faqPage===pages?'disabled':''} aria-label="Остання сторінка">»</button>`;
  const faqSchema = $('#faq-schema');
  if (faqSchema) faqSchema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  });
  $$('.faq-question', accordion).forEach((button, index) => {
    const item = faqs[index];
    button.addEventListener('click', () => openAnswer(item.question, item.answer));
  });
  enhanceClickableHints(accordion);
  $$('[data-faq-page]', pagination).forEach(button => button.addEventListener('click', () => { faqPage = Number(button.dataset.faqPage); renderFaqPage(); }));
  $$('[data-faq-nav]', pagination).forEach(button => button.addEventListener('click', () => { faqPage = button.dataset.faqNav === 'first' ? 1 : button.dataset.faqNav === 'last' ? pages : faqPage + (button.dataset.faqNav === 'prev' ? -1 : 1); renderFaqPage(); }));
}
async function loadFaqs() {
  const accordion = $('.accordion');
  accordion.innerHTML = loadingMarkup('Завантажуємо питання…');
  const data = await apiList('faqs');
  faqItems = Array.isArray(data) ? data.filter(item => item.status === 'active').sort((a, b) => Number(a.order || 0) - Number(b.order || 0)) : [];
  if (!faqItems.length) { accordion.innerHTML = emptyMarkup('Питань поки немає', 'Поставте своє питання в Енергоколі.'); $('.faq-pagination').innerHTML = ''; return; }
  faqPage = 1; renderFaqPage();
}
async function loadTopics() {
  topicList.innerHTML = loadingMarkup('Завантажуємо питання…');
  const data = await apiList('questions');
  if (!Array.isArray(data) || !data.length) { topicList.innerHTML = emptyMarkup('Питань поки немає', 'Поставте перше питання — інженер відповість якнайшвидше.'); return; }
  topicList.innerHTML = '';
  data.slice(0, 8).forEach(question => topicList.append(renderTopicCard(question)));
  scheduleTopicViewportFit();
  enhanceClickableHints(topicList);
}
bindTopicVotes();
loadTopics();
loadFaqs();
syncLocalizedLinks();
window.addEventListener('ink:languagechange', () => syncLocalizedLinks());
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
  const response = await fetch('/api/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({author:'Гість',city:'',title:input.value.trim(),body:''}) }).catch(() => null);
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
const selectorStartMarkup = selectorContent.innerHTML;
const steps = [
  { eyebrow: 'AI-підбір / 02', title: 'Що має працювати?', options: ['Базові прилади', 'Увесь об’єкт', 'Критичні лінії бізнесу'] },
  { eyebrow: 'AI-підбір / 03', title: 'Ваш пріоритет?', options: ['Максимум автономності', 'Оптимальний бюджет', 'Можливість додати сонце'] }
];
const selectorResults = {
  Base: {
    title: 'Вам пасує система Base.',
    badge: '4.2 kW · 2.5 kWh',
    object: 'Квартира',
    need: 'backup',
    copy: 'Для квартири або компактного будинку: світло, Wi‑Fi, холодильник, котел і базова техніка без переплати за зайвий резерв.'
  },
  Pulse: {
    title: 'Вам пасує система Pulse.',
    badge: '6 kW · 5 kWh',
    object: 'Приватний будинок',
    need: 'full',
    copy: 'Для приватного будинку, де мають працювати насос, котел, кухня, зв’язок і комфортні побутові сценарії під час відключень.'
  },
  Shift: {
    title: 'Вам пасує система Shift.',
    badge: '12 kW · 10 kWh',
    object: 'Магазин / ресторан',
    need: 'full',
    copy: 'Для бізнесу: каса, холодильники, освітлення, мережеве обладнання та критичні лінії, які не можна зупиняти.'
  },
  Orbit: {
    title: 'Вам пасує система Orbit.',
    badge: '15 kW · 20 kWh',
    object: 'Інше',
    need: 'solar',
    copy: 'Для максимальної автономності, нестабільної мережі або сценарію з сонячними панелями та запасом на масштабування.'
  }
};
function getSelectorResult() {
  const [place = '', load = '', priority = ''] = answers;
  if (place === 'Бізнес' || load === 'Критичні лінії бізнесу') return selectorResults.Shift;
  if (priority === 'Максимум автономності' || priority === 'Можливість додати сонце') return selectorResults.Orbit;
  if (place === 'Квартира' && load === 'Базові прилади') return selectorResults.Base;
  if (priority === 'Оптимальний бюджет' && load === 'Базові прилади') return selectorResults.Base;
  return selectorResults.Pulse;
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
    comment.value = `AI-підбір рекомендував ${result.title.replace('Вам пасує система ', '').replace('.', '')} (${result.badge}). Відповіді: ${answers.join(' → ')}. Прошу зробити точний розрахунок під мій об'єкт.`;
  }
}
function bindSelectorOptions(root = dialog) {
  $$('.selector-options button', root).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, 1), { once:true }));
}
function resetSelector() {
  answers.length = 0;
  selectorContent.innerHTML = selectorStartMarkup;
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
  const step = steps[stepIndex];
  $('.selector-progress i', dialog).style.width = `${(stepIndex + 2) * 33.34}%`;
  selectorContent.innerHTML = `<p class="eyebrow">${step.eyebrow}</p><h2>${step.title}</h2><div class="selector-options">${step.options.map(o => `<button type="button" data-answer="${o}">${o}<span>→</span></button>`).join('')}</div><p class="selector-hint">Підбираємо архітектуру, а не окрему коробку</p>`;
  $$('.selector-options button', selectorContent).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, stepIndex + 2), { once:true }));
  enhanceClickableHints(selectorContent);
}
function handleAnswer(answer, nextStep) {
  answers.push(answer);
  if (nextStep < 3) return renderStep(nextStep - 1);
  const result = getSelectorResult();
  selectorContent.innerHTML = `<p class="eyebrow">Результат / ІНК · ${escapeHtml(result.badge)}</p><h2>${escapeHtml(result.title)}</h2><p style="color:var(--muted)">${escapeHtml(result.copy)}</p><a class="button button-primary" href="#consultation" id="selector-result">Отримати точний розрахунок <span>↗</span></a>`;
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
