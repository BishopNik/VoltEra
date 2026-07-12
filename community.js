const lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('ink-lang') || 'uk';
const isEn = lang === 'en';
const text = {
  answered: isEn ? 'Answered' : 'Відповідь є',
  waiting: isEn ? 'Waiting for answer' : 'Очікує відповіді',
  engineerAnswer: isEn ? 'ENGINEER ANSWER' : 'ВІДПОВІДЬ ІНЖЕНЕРА',
  answer: isEn ? 'ANSWER' : 'ВІДПОВІДЬ',
  guest: isEn ? 'Guest' : 'Гість',
  ukraine: isEn ? 'Ukraine' : 'Україна',
  show: isEn ? 'Show answers ↓' : 'Показати відповіді ↓',
  hide: isEn ? 'Hide answers ↑' : 'Сховати відповіді ↑',
  none: isEn ? 'No answers yet' : 'Відповідей ще немає',
  count: count => isEn ? `${count} questions in database` : `${count} питань у базі`,
  added: isEn ? 'Question added. An engineer will answer as soon as possible.' : 'Питання додано. Інженер відповість якнайшвидше.',
  failed: isEn ? 'Could not add the question.' : 'Не вдалося додати питання.'
};
if (isEn) {
  document.documentElement.lang = 'en';
  document.title = 'Energy Circle — inverter questions and answers | INK';
  document.querySelector('.page-nav a[href="/#journal"]').textContent = 'Journal';
  document.querySelector('.page-nav a[href="/gallery.html"]').textContent = 'Gallery';
  document.querySelector('.page-nav a[href="/#contacts"]').textContent = 'Contacts';
  document.querySelectorAll('a[href="#ask"]').forEach(a => a.textContent = a.textContent.includes('+') ? '+ New question' : 'Ask');
  document.querySelector('.page-eyebrow').textContent = 'Energy Circle';
  document.querySelector('.page-hero h1').innerHTML = 'Questions <em>answered by engineers.</em>';
  document.querySelector('.page-lead').textContent = 'Browse discussions, open answers, or leave your own question.';
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
function render() {
  const slice = questions.slice(page * perPage, (page + 1) * perPage);
  list.innerHTML = questions.length ? '' : `<div class="section-empty"><div><strong>${isEn ? 'No questions yet' : 'Питань поки немає'}</strong>${isEn ? 'Ask the first question — an engineer will answer.' : 'Поставте перше питання — інженер відповість.'}</div></div>`;
  slice.forEach(q => {
    const article = document.createElement('article');
    article.className = 'community-question';
    const answers = (q.answers || []).map(a => `<div class="community-answer"><strong>${a.role === 'engineer' ? text.engineerAnswer : text.answer}</strong><p>${a.text}</p></div>`).join('');
    article.innerHTML = `<header><span class="page-eyebrow">${q.status === 'answered' ? text.answered : text.waiting}</span><small>♥ ${q.likes || 0}</small></header><h2>${q.title}</h2><p>${q.author || text.guest} · ${q.city || text.ukraine}</p><button type="button">${answers ? text.show : text.none}</button><div hidden>${answers}</div>`;
    const btn = article.querySelector('button');
    btn.disabled = !answers;
    btn.onclick = () => {
      const box = btn.nextElementSibling;
      box.hidden = !box.hidden;
      btn.textContent = box.hidden ? text.show : text.hide;
    };
    list.append(article);
  });
  document.querySelector('#community-count').textContent = text.count(questions.length);
  document.querySelector('#page-number').textContent = `${page + 1} / ${Math.max(1, Math.ceil(questions.length / perPage))}`;
  document.querySelector('#prev-page').disabled = page === 0;
  document.querySelector('#next-page').disabled = (page + 1) * perPage >= questions.length;
}
async function load() {
  list.innerHTML = `<div class="section-loader"><i></i><span>${isEn ? 'Loading questions…' : 'Завантажуємо питання…'}</span></div>`;
  const r = await fetch('/api/questions').catch(() => null);
  questions = r?.ok ? await r.json() : [];
  render();
}
load();
document.querySelector('#prev-page').onclick = () => { if (page) { page--; render(); } };
document.querySelector('#next-page').onclick = () => { if ((page + 1) * perPage < questions.length) { page++; render(); } };
document.querySelector('#ask').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button[type="submit"]'); submit.disabled = true; submit.classList.add('is-sending');
  const r = await fetch('/api/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).catch(() => null);
  submit.disabled = false; submit.classList.remove('is-sending');
  const status = form.querySelector('[role=status]');
  if (r?.ok) {
    status.textContent = text.added;
    form.reset();
    await load();
  } else status.textContent = text.failed;
});
