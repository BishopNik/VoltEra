const lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('ink-lang') || 'uk';
const isEn = lang === 'en';
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const text = {
  answered: isEn ? 'Answers available' : 'Є відповіді',
  waiting: isEn ? 'Open discussion' : 'Відкрите обговорення',
  engineerAnswer: isEn ? 'ENGINEER ANSWER' : 'ВІДПОВІДЬ ІНЖЕНЕРА',
  communityAnswer: isEn ? 'COMMUNITY ANSWER' : 'ВІДПОВІДЬ УЧАСНИКА',
  guest: isEn ? 'Guest' : 'Гість',
  ukraine: isEn ? 'Ukraine' : 'Україна',
  show: isEn ? 'Show answers ↓' : 'Показати відповіді ↓',
  hide: isEn ? 'Hide answers ↑' : 'Сховати відповіді ↑',
  none: isEn ? 'No answers yet' : 'Відповідей ще немає',
  reply: isEn ? 'Reply to this question' : 'Відповісти на питання',
  send: isEn ? 'Publish reply →' : 'Опублікувати відповідь →',
  name: isEn ? 'Your name' : "Ваше ім'я",
  replyText: isEn ? 'Your answer or experience' : 'Ваша відповідь або власний досвід',
  count: count => {
    if (isEn) return `${count} ${count === 1 ? 'question' : 'questions'} in database`;
    const mod10 = count % 10, mod100 = count % 100;
    const word = mod10 === 1 && mod100 !== 11 ? 'питання' : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 'питання' : 'питань';
    return `${count} ${word} у базі`;
  },
  added: isEn ? 'Question added. An engineer will answer as soon as possible.' : 'Питання додано. Інженер відповість якнайшвидше.',
  replyAdded: isEn ? 'Your answer is published.' : 'Вашу відповідь опубліковано.',
  failed: isEn ? 'Could not save. Please try again.' : 'Не вдалося зберегти. Спробуйте ще раз.'
};

if (isEn) {
  document.documentElement.lang = 'en';
  document.title = 'Energy Circle — inverter questions and answers | INK';
  document.querySelector('.page-nav a[href="/#journal"]').textContent = 'Journal';
  document.querySelector('.page-nav a[href="/gallery.html"]').textContent = 'Gallery';
  document.querySelector('.page-nav a[href="/#contacts"]').textContent = 'Contacts';
  document.querySelectorAll('a[href="#ask"]').forEach(a => a.textContent = a.textContent.includes('+') ? '+ New question' : 'Ask');
  document.querySelector('.page-eyebrow').textContent = 'Energy Circle';
  document.querySelector('.page-hero h1').innerHTML = 'Questions <em>answered by engineers and users.</em>';
  document.querySelector('.page-lead').textContent = 'Browse discussions, share your experience, or leave a new question.';
  document.querySelector('.community-toolbar .page-eyebrow').textContent = 'Community';
  document.querySelector('#community-count').textContent = 'Loading questions…';
  document.querySelector('#prev-page').textContent = '← Previous';
  document.querySelector('#next-page').textContent = 'Next →';
  document.querySelector('#ask h2').textContent = 'Ask a question';
  document.querySelector('#ask label:nth-of-type(1)').childNodes[0].textContent = 'Your name';
  document.querySelector('#ask label:nth-of-type(2)').childNodes[0].textContent = 'City';
  document.querySelector('#ask label:nth-of-type(3)').childNodes[0].textContent = 'Question';
  document.querySelector('#ask button').textContent = 'Publish →';
  document.querySelector('.page-footer .page-container').textContent = '© 2026 INK · Open Energy Circle';
}

const list = document.querySelector('#community-list');
let questions = [], page = 0;
const perPage = 5;

function answerMarkup(answer) {
  const engineer = answer.role === 'engineer';
  return `<div class="community-answer ${engineer ? 'is-engineer' : 'is-community'}"><strong>${engineer ? text.engineerAnswer : text.communityAnswer} · ${escapeHtml(answer.author || text.guest)}</strong><p>${escapeHtml(answer.text)}</p></div>`;
}

function bindQuestion(article, question) {
  const answersButton = article.querySelector('.answers-toggle');
  const answersBox = article.querySelector('.answers-box');
  answersButton?.addEventListener('click', () => {
    answersBox.hidden = !answersBox.hidden;
    answersButton.textContent = answersBox.hidden ? text.show : text.hide;
  });
  const replyButton = article.querySelector('.reply-toggle');
  const replyForm = article.querySelector('.community-reply-form');
  replyButton.addEventListener('click', () => {
    replyForm.hidden = !replyForm.hidden;
    if (!replyForm.hidden) replyForm.querySelector('input').focus();
  });
  replyForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!replyForm.reportValidity()) return;
    const submit = replyForm.querySelector('button[type="submit"]');
    const status = replyForm.querySelector('[role="status"]');
    submit.disabled = true; submit.classList.add('is-sending');
    const payload = Object.fromEntries(new FormData(replyForm));
    const response = await fetch(`/api/questions/${encodeURIComponent(question._id)}/answers`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(() => null);
    submit.disabled = false; submit.classList.remove('is-sending');
    if (!response?.ok) { status.textContent = text.failed; return; }
    status.textContent = text.replyAdded;
    replyForm.reset();
    await load(question._id);
  });
}

function render(focusId = '') {
  const slice = questions.slice(page * perPage, (page + 1) * perPage);
  list.innerHTML = questions.length ? '' : `<div class="section-empty"><div><strong>${isEn ? 'No questions yet' : 'Питань поки немає'}</strong>${isEn ? 'Ask the first question.' : 'Поставте перше питання.'}</div></div>`;
  slice.forEach(question => {
    const article = document.createElement('article');
    article.className = 'community-question';
    article.id = String(question._id);
    const answers = Array.isArray(question.answers) ? question.answers : [];
    article.innerHTML = `<header><span class="page-eyebrow">${answers.length ? text.answered : text.waiting}</span><small>♥ ${Number(question.likes || 0)}</small></header><h2>${escapeHtml(question.title)}</h2><p>${escapeHtml(question.author || text.guest)} · ${escapeHtml(question.city || text.ukraine)}</p><div class="community-actions">${answers.length ? `<button class="answers-toggle" type="button">${text.show}</button>` : `<span>${text.none}</span>`}<button class="reply-toggle" type="button">${text.reply} +</button></div><div class="answers-box" hidden>${answers.map(answerMarkup).join('')}</div><form class="community-reply-form" hidden><label>${text.name}<input name="author" maxlength="80" required></label><label>${text.replyText}<textarea name="text" rows="4" maxlength="2000" required></textarea></label><button class="page-button" type="submit">${text.send}</button><p role="status" aria-live="polite"></p></form>`;
    bindQuestion(article, question);
    list.append(article);
  });
  document.querySelector('#community-count').textContent = text.count(questions.length);
  document.querySelector('#page-number').textContent = `${page + 1} / ${Math.max(1, Math.ceil(questions.length / perPage))}`;
  document.querySelector('#prev-page').disabled = page === 0;
  document.querySelector('#next-page').disabled = (page + 1) * perPage >= questions.length;
  if (focusId) requestAnimationFrame(() => {
    const target = document.getElementById(String(focusId));
    if (!target) return;
    const answersBox = target.querySelector('.answers-box');
    const answersButton = target.querySelector('.answers-toggle');
    if (answersBox && answersButton) { answersBox.hidden = false; answersButton.textContent = text.hide; }
    target.scrollIntoView({behavior:'smooth',block:'center'});
  });
}

async function load(focusId = '') {
  list.innerHTML = `<div class="section-loader"><i></i><span>${isEn ? 'Loading questions…' : 'Завантажуємо питання…'}</span></div>`;
  const response = await fetch('/api/questions').catch(() => null);
  questions = response?.ok ? await response.json() : [];
  const targetId = focusId || decodeURIComponent(location.hash.slice(1));
  if (targetId) {
    const index = questions.findIndex(question => String(question._id) === targetId);
    if (index >= 0) page = Math.floor(index / perPage);
  }
  render(targetId);
}

load();
document.querySelector('#prev-page').onclick = () => { if (page) { page--; render(); } };
document.querySelector('#next-page').onclick = () => { if ((page + 1) * perPage < questions.length) { page++; render(); } };
document.querySelector('#ask').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button[type="submit"]'); submit.disabled = true; submit.classList.add('is-sending');
  const response = await fetch('/api/questions', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(() => null);
  submit.disabled = false; submit.classList.remove('is-sending');
  const status = form.querySelector('[role="status"]');
  if (response?.ok) { status.textContent = text.added; form.reset(); await load(); }
  else status.textContent = text.failed;
});
