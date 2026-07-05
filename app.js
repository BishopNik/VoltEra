const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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

// Reviews
const reviews = $$('.review-card');
let reviewIndex = 0;
function showReview(index) {
  reviewIndex = (index + reviews.length) % reviews.length;
  reviews.forEach((review, i) => review.classList.toggle('is-current', i === reviewIndex));
}
$('.review-prev').addEventListener('click', () => showReview(reviewIndex - 1));
$('.review-next').addEventListener('click', () => showReview(reviewIndex + 1));

// Review publishing prototype. Content stays local until the moderation API is connected.
const reviewForm = $('#review-form');
const reviewTrack = $('.review-track');
function createReview(data) {
  const article = document.createElement('article');
  article.className = 'review-card';
  const stars = document.createElement('div');
  stars.className = 'stars';
  stars.setAttribute('aria-label', `${data.rating} з 5`);
  stars.textContent = '★'.repeat(Number(data.rating)) + '☆'.repeat(5 - Number(data.rating));
  const quote = document.createElement('blockquote');
  quote.textContent = `«${data.text}»`;
  const reply = document.createElement('div');
  reply.className = 'team-reply';
  reply.innerHTML = '<span>↳ VOLTERA БАЧИТЬ ВАШ ВІДГУК</span><p>Дякуємо. Команда прочитає відгук і відповість після модерації.</p>';
  const footer = document.createElement('footer');
  const initials = data.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  footer.innerHTML = `<div class="avatar">${initials}</div><div><strong></strong><span></span></div><b>НОВИЙ ВІДГУК</b>`;
  $('strong', footer).textContent = data.name;
  $('span', footer).textContent = data.city;
  article.append(stars, quote, reply, footer);
  reviewTrack.append(article);
  reviews.push(article);
  return article;
}
try {
  JSON.parse(localStorage.getItem('voltera-reviews') || '[]').forEach(createReview);
} catch (error) {
  localStorage.removeItem('voltera-reviews');
}
$('.review-add').addEventListener('click', () => {
  reviewForm.hidden = false;
  reviewForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('.review-form-close').addEventListener('click', () => { reviewForm.hidden = true; });
reviewForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!reviewForm.reportValidity()) return;
  const fields = new FormData(reviewForm);
  const data = { name: fields.get('reviewName'), city: fields.get('reviewCity'), rating: fields.get('reviewRating'), text: fields.get('reviewText') };
  createReview(data);
  const saved = JSON.parse(localStorage.getItem('voltera-reviews') || '[]');
  saved.push(data);
  localStorage.setItem('voltera-reviews', JSON.stringify(saved.slice(-10)));
  showReview(reviews.length - 1);
  reviewForm.reset();
  reviewForm.hidden = true;
  reviewTrack.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Brand comparison starts a consultation with useful context already filled in.
$$('.brand-compare').forEach(button => button.addEventListener('click', () => {
  const comment = $('#lead-form textarea[name="comment"]');
  comment.value = `Хочу порівняти ${button.dataset.brand} з іншими інверторами під мій об'єкт.`;
  $('#consultation').scrollIntoView({ behavior: 'smooth' });
}));

// Project passport lightbox
const projectDialog = $('#project-dialog');
const projectData = {
  home: { image: '/assets/projects/home-backup.jpg', title: 'Будинок / Київщина', copy: 'Система Deye 8 kW з резервом 20 kWh. Критичні лінії: свердловина, котел, холодильник, кухня та два робочі місця.', stats: ['до 24 год', '< 10 мс', '2 дні'] },
  solar: { image: '/assets/projects/solar-roof.jpg', title: 'Гібридна СЕС / Львівщина', copy: 'Сонячне поле 10.8 kW, гібридний інвертор і резерв для базових навантажень будинку. Пріоритет — власне споживання.', stats: ['10.8 kW', '76%', '4 дні'] },
  business: { image: '/assets/projects/business-backup.jpg', title: 'Комерційний об’єкт / Львів', copy: 'Трифазна система з 21 батарейним модулем по 5 kWh. Резерв критичних ліній, вентиляції, холодильного обладнання та робочих зон.', stats: ['105 kWh', '3 фази', '21 модуль'] }
};
$$('.project-open').forEach(button => button.addEventListener('click', () => {
  const data = projectData[button.dataset.project];
  $('img', projectDialog).src = data.image;
  $('img', projectDialog).alt = button.querySelector('img').alt;
  $('h2', projectDialog).textContent = data.title;
  $('.project-dialog-copy', projectDialog).textContent = data.copy;
  $$('#project-dialog dd').forEach((item, index) => { item.textContent = data.stats[index]; });
  projectDialog.showModal();
}));
$('.project-dialog-close').addEventListener('click', () => projectDialog.close());
projectDialog.addEventListener('click', event => { if (event.target === projectDialog) projectDialog.close(); });

// Compact community board prototype
$$('.topic-votes button').forEach(button => button.addEventListener('click', () => {
  if (button.classList.contains('voted')) return;
  button.classList.add('voted');
  const value = button.parentElement.querySelector('strong');
  value.textContent = Number(value.textContent) + 1;
}));
$('#topic-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#topic-input');
  if (!input.value.trim()) return;
  const article = document.createElement('article');
  article.className = 'topic-card is-new';
  const vote = document.createElement('div');
  vote.className = 'topic-votes';
  vote.innerHTML = '<button type="button" aria-label="Підтримати питання">↑</button><strong>1</strong>';
  const content = document.createElement('div');
  const state = document.createElement('span');
  state.className = 'topic-state';
  state.textContent = 'ЧЕКАЄ ВІДПОВІДІ';
  const title = document.createElement('h3');
  title.textContent = input.value.trim();
  const copy = document.createElement('p');
  copy.textContent = 'Питання передано інженеру VoltEra. Відповідь з’явиться тут після підключення модерації.';
  const footer = document.createElement('footer');
  footer.textContent = 'Нове питання · щойно';
  content.append(state, title, copy, footer);
  article.append(vote, content);
  $('.topic-list').prepend(article);
  input.value = '';
});

// Consultation form demo state — ready to swap for an API endpoint.
$('#lead-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
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
  selectorContent.innerHTML = `<p class="eyebrow">Результат / VOLTERA</p><h2>Вам пасує система Pulse.</h2><p style="color:var(--muted)">Гібридний інвертор 6 kW і батарея від 7.1 kWh. Архітектуру можна масштабувати та доповнити сонячними панелями.</p><a class="button button-primary" href="#consultation" id="selector-result">Отримати точний розрахунок <span>↗</span></a>`;
  $('#selector-result').addEventListener('click', () => dialog.close());
}
$$('.js-open-selector').forEach(button => button.addEventListener('click', () => dialog.showModal()));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$$('.selector-options button', dialog).forEach(btn => btn.addEventListener('click', () => handleAnswer(btn.dataset.answer, 1)));

// Keep one FAQ answer open at a time.
$$('.accordion details').forEach(detail => detail.addEventListener('toggle', () => {
  if (detail.open) $$('.accordion details').forEach(other => { if (other !== detail) other.open = false; });
}));
