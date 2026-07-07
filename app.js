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
  const desktop = window.matchMedia('(min-width: 801px)').matches;
  reviews.forEach((review, i) => {
    review.classList.toggle('is-current', i === reviewIndex);
    review.classList.toggle('is-companion', desktop && i === (reviewIndex + 1) % reviews.length);
  });
}
$('.review-prev').addEventListener('click', () => showReview(reviewIndex - (window.innerWidth > 800 ? 2 : 1)));
$('.review-next').addEventListener('click', () => showReview(reviewIndex + (window.innerWidth > 800 ? 2 : 1)));
showReview(0);

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
  reply.innerHTML = '<span>↳ ІНК БАЧИТЬ ВАШ ВІДГУК</span><p>Дякуємо. Команда прочитає відгук і відповість після модерації.</p>';
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
  createReview({...data, rating:Number(data.rating)});
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
const projectGrid = $('.project-grid');
$('.project-next').addEventListener('click', () => { projectGrid.append(projectGrid.firstElementChild); });
$('.project-prev').addEventListener('click', () => { projectGrid.prepend(projectGrid.lastElementChild); });

// Compact community board prototype
$$('.topic-votes button').forEach(button => button.addEventListener('click', () => {
  if (button.classList.contains('voted')) return;
  button.classList.add('voted');
  const value = button.parentElement.querySelector('strong');
  value.textContent = Number(value.textContent) + 1;
}));
$('#topic-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#topic-input');
  if (!input.value.trim()) return;
  const response = await fetch('/api/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({author:'Гість',city:'',title:input.value.trim(),body:''}) }).catch(() => null);
  if (!response?.ok) return;
  const article = document.createElement('article');
  article.className = 'topic-card is-new';
  const vote = document.createElement('div');
  vote.className = 'topic-votes';
  vote.innerHTML = '<button type="button" aria-label="Відмітити як корисне">♥</button><strong>0</strong><small>корисно</small>';
  const content = document.createElement('div');
  const state = document.createElement('span');
  state.className = 'topic-state';
  state.textContent = 'ЧЕКАЄ ВІДПОВІДІ';
  const title = document.createElement('h3');
  title.textContent = input.value.trim();
  const copy = document.createElement('p');
  copy.textContent = 'Питання передано інженеру ІНК. Відповідь з’явиться на сторінці Енергокола.';
  const footer = document.createElement('footer');
  footer.textContent = 'Нове питання · щойно';
  content.append(state, title, copy, footer);
  article.append(vote, content);
  $('.topic-list').prepend(article);
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
