const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const pageLang = () => new URLSearchParams(location.search).get('lang') || localStorage.getItem('ink-lang') || 'uk';
const apiList = async type => {
  if (pageLang() !== 'uk' && ['reviews', 'projects', 'articles', 'questions'].includes(type)) return null;
  const response = await fetch(`/api/${type}`).catch(() => null);
  return response?.ok ? response.json() : null;
};

function enhanceClickableHints(root = document) {
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
    ['.topic-votes button', 'Позначити питання корисним'],
    ['.topic-answers', 'Переглянути відповідь інженера'],
    ['.faq-question', 'Відкрити відповідь без зміщення сторінки'],
    ['.submit-button', 'Надіслати заявку в CRM'],
    ['.lang-switch', 'Open English version'],
    ['.language-switcher button', 'Змінити мову сайту'],
    ['.circle-all-link', 'Перейти до всіх питань'],
    ['.floating-consult', 'Швидко перейти до консультації']
  ];
  explicitHints.forEach(([selector, hint]) => $$(selector, root).forEach(element => {
    element.dataset.hint = hint;
    if (!element.title) element.title = hint;
  }));
  $$('a,button,[role="button"]', root).forEach(element => {
    if (element.dataset.hint) return;
    const label = element.getAttribute('aria-label') || element.title || element.textContent.trim().replace(/\s+/g, ' ');
    if (!label) return;
    const hint = label.length > 72 ? `${label.slice(0, 69)}…` : label;
    element.dataset.hint = hint;
    if (!element.title) element.title = hint;
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
  prev.addEventListener('click', () => target.scrollBy({ left: axis === 'x' ? -step() : 0, top: axis === 'y' ? -step() : 0, behavior: 'smooth' }));
  next.addEventListener('click', () => target.scrollBy({ left: axis === 'x' ? step() : 0, top: axis === 'y' ? step() : 0, behavior: 'smooth' }));
  target.insertAdjacentElement('afterend', nav);
  enhanceClickableHints(nav);
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
  const reply = data.reply || 'Дякуємо. Команда прочитає відгук і відповість після модерації.';
  article.innerHTML = `<div class="stars" aria-label="${rating} з 5">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><blockquote>«${escapeHtml(data.text || '')}»</blockquote><div class="team-reply"><span>↳ ВІДПОВІДЬ ІНК</span><p>${escapeHtml(reply)}</p></div><footer><div class="avatar">${escapeHtml(initials)}</div><div><strong>${escapeHtml(data.name || 'Клієнт ІНК')}</strong><span>${escapeHtml(data.city || 'Україна')}</span></div><b>${data.status === 'waiting' ? 'ЧЕКАЄ МОДЕРАЦІЇ' : 'ПЕРЕВІРЕНИЙ ВІДГУК'}</b></footer>`;
  reviewTrack.append(article);
  reviews.push(article);
  return article;
}
async function loadReviews() {
  const data = await apiList('reviews');
  if (!Array.isArray(data) || !data.length) return showReview(0);
  reviewTrack.innerHTML = '';
  reviews.splice(0, reviews.length);
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
  submit.textContent = 'Публікуємо…';
  const response = await fetch('/api/reviews', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }).catch(() => null);
  submit.disabled = false;
  submit.textContent = 'Опублікувати відгук ↗';
  if (!response?.ok) { submit.textContent = 'Помилка. Спробуйте ще раз'; return; }
  createReview({...data, rating:Number(data.rating), status:'waiting'});
  showReview(reviews.length - 1);
  reviewForm.reset();
  reviewForm.hidden = true;
  reviewTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
showReview(0);
loadReviews();

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
function bindProjectButtons() {
  $$('.project-open').forEach(button => button.addEventListener('click', () => {
    const data = projectData.get(button.dataset.project);
    if (!data) return;
    $('img', projectDialog).src = data.image;
    $('img', projectDialog).alt = button.querySelector('img').alt;
    $('h2', projectDialog).textContent = data.title;
    $('.project-dialog-copy', projectDialog).textContent = data.copy;
    $$('#project-dialog dd').forEach((item, index) => { item.textContent = data.stats[index] || '—'; });
    projectDialog.showModal();
  }));
}
function renderProjectCard(project, index) {
  const id = String(project._id || index);
  const large = index === 0 ? ' project-large' : '';
  projectData.set(id, { image:project.image || '/assets/projects/home-backup.jpg', title:`${project.title} / ${project.city || 'Україна'}`, copy:project.description || 'Паспорт системи редагується в адмінці.', stats:[project.type || 'об’єкт', project.city || 'Україна', project.status || 'published'] });
  return `<article class="project-card${large} reveal visible"><button type="button" class="project-open" data-project="${escapeHtml(id)}" aria-label="Відкрити об'єкт ${escapeHtml(project.title)}"><img src="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(project.title)}" loading="lazy"><span class="project-arrow">↗</span></button><div class="project-meta"><div><span>${escapeHtml(project.city || 'Україна')} · ${escapeHtml(project.type || 'об’єкт')}</span><h3>${escapeHtml(project.title)}</h3></div><p>${escapeHtml(project.description || '')}</p></div></article>`;
}
async function loadProjects() {
  const data = await apiList('projects');
  if (!Array.isArray(data) || !data.length) return bindProjectButtons();
  projectData.clear();
  projectGrid.innerHTML = data.slice(0, 6).map(renderProjectCard).join('');
  bindProjectButtons();
  enhanceClickableHints(projectGrid);
}
bindProjectButtons();
$('.project-dialog-close').addEventListener('click', () => projectDialog.close());
projectDialog.addEventListener('click', event => { if (event.target === projectDialog) projectDialog.close(); });
$('.project-next').addEventListener('click', () => { if (projectGrid.firstElementChild) projectGrid.append(projectGrid.firstElementChild); });
$('.project-prev').addEventListener('click', () => { if (projectGrid.lastElementChild) projectGrid.prepend(projectGrid.lastElementChild); });
loadProjects();

// Journal from API
const articleGrid = $('.article-grid');
function renderArticleCard(article, index) {
  const url = article.url || `/articles/${article.slug || article._id}.html`;
  const lead = index === 0 ? ' article-lead' : '';
  const number = String(index + 1).padStart(2, '0');
  return `<a class="article-card${lead} reveal visible" href="${escapeHtml(url)}"><span>${escapeHtml(article.category || 'ЖУРНАЛ')} · ${index === 0 ? '9' : '5'} ХВ</span>${index === 0 ? '<div class="article-visual"><b>10</b><i>ms</i><small>час, якого ви<br>не помітите</small></div>' : `<div class="article-number">${number}</div>`}<h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt || '')}</p><strong>Читати статтю ↗</strong></a>`;
}
async function loadArticles() {
  const data = await apiList('articles');
  if (Array.isArray(data) && data.length) {
    articleGrid.innerHTML = data.slice(0, 12).map(renderArticleCard).join('');
    enhanceClickableHints(articleGrid);
  }
}
loadArticles();

// Compact community board from API
const topicList = $('.topic-list');
function bindTopicVotes(root = document) {
  $$('.topic-votes button', root).forEach(button => button.addEventListener('click', () => {
    if (button.classList.contains('voted')) return;
    button.classList.add('voted');
    const value = button.parentElement.querySelector('strong');
    value.textContent = Number(value.textContent) + 1;
  }));
}
function renderTopicCard(question, isNew = false) {
  const answered = question.status === 'answered' || (question.answers || []).length > 0;
  const answer = (question.answers || [])[0]?.text || '';
  const article = document.createElement('article');
  article.className = `topic-card${isNew ? ' is-new' : ''}`;
  article.innerHTML = `<div class="topic-votes"><button type="button" aria-label="Відмітити як корисне">♥</button><strong>${Number(question.likes || 0)}</strong><small>корисно</small></div><div><span class="topic-state ${answered ? 'answered' : ''}">${answered ? 'ВІДПОВІВ ІНЖЕНЕР' : 'ОБГОВОРЕННЯ'}</span><h3>${escapeHtml(question.title)}</h3><p>${escapeHtml(answer || question.body || 'Питання збережено в базі. Інженер відповість у CRM.')}</p>${answered ? `<button class="topic-answers" type="button" data-answer="${escapeHtml(answer)}">Переглянути відповідь ↓</button>` : '<a class="topic-answers" href="/community.html">Відкрити обговорення →</a>'}<footer>${escapeHtml(question.author || 'Гість')} · ${escapeHtml(question.city || 'Україна')} <span>${(question.answers || []).length || 'очікує відповіді'}</span></footer></div>`;
  bindTopicVotes(article);
  const answerButton = $('.topic-answers[data-answer]', article);
  if (answerButton) answerButton.addEventListener('click', () => openAnswer($('h3', article).textContent, answerButton.dataset.answer));
  return article;
}
function renderFaqFromQuestions(questions) {
  const accordion = $('.accordion');
  const answered = questions.filter(question => question.status === 'answered' || (question.answers || []).length).slice(0, 6);
  if (!answered.length) return;
  accordion.innerHTML = answered.map((question, index) => `<button class="faq-question" type="button" data-api-faq="${index}"><span>${escapeHtml(question.title)}</span><i>↓</i></button>`).join('');
  $$('.faq-question', accordion).forEach((button, index) => {
    const question = answered[index];
    const answer = question.answers?.[0]?.text || question.body || 'Відповідь готується інженером ІНК.';
    button.addEventListener('click', () => openAnswer(question.title, answer));
  });
  enhanceClickableHints(accordion);
}
async function loadTopics() {
  const data = await apiList('questions');
  if (!Array.isArray(data) || !data.length) return bindTopicVotes();
  renderFaqFromQuestions(data);
  topicList.innerHTML = '';
  data.slice(0, 8).forEach(question => topicList.append(renderTopicCard(question)));
  enhanceClickableHints(topicList);
}
bindTopicVotes();
loadTopics();
$('#topic-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#topic-input');
  if (!input.value.trim()) return;
  const response = await fetch('/api/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({author:'Гість',city:'',title:input.value.trim(),body:''}) }).catch(() => null);
  if (!response?.ok) return;
  const question = await response.json();
  topicList.prepend(renderTopicCard(question, true));
  enhanceClickableHints(topicList.firstElementChild || topicList);
  input.value = '';
});

// Consultation form → API/CRM.
$('#lead-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const form = event.currentTarget;
  const fields = new FormData(form);
  const payload = Object.fromEntries(fields.entries());
  const submit = form.querySelector('.submit-button');
  submit.disabled = true;
  submit.innerHTML = 'Надсилаємо…';
  const response = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).catch(() => null);
  submit.disabled = false;
  submit.innerHTML = 'Надіслати запит <span>↗</span>';
  if (!response?.ok) { submit.innerHTML = 'Не вдалося. Повторити <span>↻</span>'; return; }
  event.currentTarget.classList.add('submitted');
});

// Three-step system selector
const dialog = $('#selector-dialog');
const selectorContent = $('.selector-content', dialog);
const answers = [];
const steps = [
  { eyebrow: 'AI-підбір / 02', title: 'Що має працювати?', options: ['Базові прилади', 'Увесь об’єкт', 'Критичні лінії бізнесу'] },
  { eyebrow: 'AI-підбір / 03', title: 'Ваш пріоритет?', options: ['Максимум автономності', 'Оптимальний бюджет', 'Можливість додати сонце'] }
];
function renderStep(stepIndex) {
  const step = steps[stepIndex];
  $('.selector-progress i', dialog).style.width = `${(stepIndex + 2) * 33.34}%`;
  selectorContent.innerHTML = `<p class="eyebrow">${step.eyebrow}</p><h2>${step.title}</h2><div class="selector-options">${step.options.map(o => `<button type="button" data-answer="${o}">${o}<span>→</span></button>`).join('')}</div><p class="selector-hint">Підбираємо архітектуру, а не окрему коробку</p>`;
  $$('.selector-options button', selectorContent).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, stepIndex + 1)));
}
function handleAnswer(answer, nextStep) {
  answers.push(answer);
  if (nextStep < 3) return renderStep(nextStep - 1);
  selectorContent.innerHTML = `<p class="eyebrow">Результат / ІНК</p><h2>Вам пасує система Pulse.</h2><p style="color:var(--muted)">Гібридний інвертор 6 kW і батарея 5 kWh. Архітектуру можна масштабувати та доповнити сонячними панелями.</p><a class="button button-primary" href="#consultation" id="selector-result">Отримати точний розрахунок <span>↗</span></a>`;
  $('#selector-result').addEventListener('click', () => dialog.close());
}
$$('.js-open-selector').forEach(button => button.addEventListener('click', () => dialog.showModal()));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$$('.selector-options button', dialog).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, 1)));

// FAQ answers open above the layout and never shift surrounding sections.
const answerDialog = $('#answer-dialog');
const faqAnswers = [
  'Потужність визначаємо за сумарним навантаженням і пусковими струмами. Для базових потреб часто достатньо 4–6 кВт, але насос, кондиціонер чи електроплита змінюють розрахунок.',
  'Залежить від ємності та навантаження. Батарея 5 кВт·год дає орієнтовно 8–10 годин для базових приладів із навантаженням близько 400 Вт.',
  'Так. Гібридна архітектура дозволяє почати з інвертора та батареї, а панелі підключити пізніше без перебудови системи.',
  'Так. Проєктуємо одно- й трифазні системи з пріоритетом кас, серверів, холодильного обладнання, освітлення та зв’язку.',
  'Ціна залежить від потужності інвертора, ємності батареї, автоматики та монтажу. Точний кошторис формуємо після карти навантажень.',
  'Так. Безпечне підключення потребує проєкту, захисту, правильного перерізу кабелів і налаштування автоматики.'
];
function openAnswer(title, copy) { $('h2', answerDialog).textContent = title; $('.answer-dialog-copy', answerDialog).textContent = copy; answerDialog.showModal(); }
$$('.faq-question').forEach(button => button.addEventListener('click', () => openAnswer($('span', button).textContent, faqAnswers[Number(button.dataset.faq)])));
const topicAnswerCopy = { q1:'Так, якщо модель батареї підтримує паралельне масштабування, напруга однакова та сумісний протокол BMS. Перед підключенням інженер вирівнює заряд модулів.', q3:'Частина ємності залишається як захисний резерв, ще частина втрачається на перетворенні. Для попереднього розрахунку закладайте 80–88% корисної енергії.' };
$$('.topic-answers[data-question]').forEach(button => button.addEventListener('click', () => openAnswer(button.closest('.topic-card').querySelector('h3').textContent, topicAnswerCopy[button.dataset.question])));
$('.answer-dialog-close').addEventListener('click', () => answerDialog.close());
answerDialog.addEventListener('click', event => { if (event.target === answerDialog) answerDialog.close(); });

setupScrollHud('.article-grid', 'x');
setupScrollHud('.topic-list', 'y');
setupScrollHud('.accordion', 'y');
enhanceClickableHints();
