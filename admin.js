const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  leads: [],
  reviews: [],
  questions: [],
  faqs: [],
  projects: [],
  articles: [],
  equipment: [],
  users: [],
  dashboard: {}
};

const titles = {
  dashboard: 'Огляд',
  leads: 'Заявки',
  reviews: 'Відгуки',
  questions: 'Питання',
  faqs: 'Короткі FAQ',
  projects: "Об'єкти",
  articles: 'Статті',
  equipment: 'Обладнання',
  users: 'Користувачі',
  settings: 'Налаштування'
};

const collections = ['leads', 'reviews', 'questions', 'faqs', 'projects', 'articles', 'equipment', 'users'];
const unreadViews = new Set(['leads', 'reviews', 'questions']);
const statusOrder = ['new', 'work', 'calc', 'done'];
const statusLabels = {
  new: ['Нова', 'status-new'],
  work: ['В роботі', 'status-work'],
  calc: ['Розрахунок', 'status-calc'],
  done: ['Завершена', 'status-done'],
  waiting: ['Чекає відповіді', 'status-new'],
  published: ['Опубліковано', 'status-done'],
  hidden: ['Приховано', 'status-calc'],
  open: ['Відкрите', 'status-work'],
  answered: ['Є відповідь', 'status-done'],
  draft: ['Чернетка', 'status-calc'],
  active: ['Активний', 'status-done'],
  review: ['На перевірці', 'status-work'],
  disabled: ['Вимкнений', 'status-calc']
};
let currentAdmin = null;
let pendingApiRequests = 0;

function updateApiLoading(delta) {
  pendingApiRequests = Math.max(0, pendingApiRequests + delta);
  document.body.classList.toggle('api-loading', pendingApiRequests > 0);
  document.body.setAttribute('aria-busy', pendingApiRequests > 0 ? 'true' : 'false');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function statusBadge(status = 'new', asButton = false) {
  const [label, cls] = statusLabels[status] || [status || '—', 'status-work'];
  const tag = asButton ? 'button' : 'b';
  const type = asButton ? ' type="button"' : '';
  return `<${tag}${type} class="status ${cls}${asButton ? ' status-cycle' : ''}" data-status="${escapeHtml(status)}">${label}</${tag}>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

async function api(path, options = {}) {
  updateApiLoading(1);
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (response.status === 401) {
      document.body.classList.add('auth-redirecting');
      const loadingTitle = $('#admin-loading-title');
      const loadingMessage = $('#admin-loading-message');
      if (loadingTitle) loadingTitle.textContent = 'Переходимо до входу';
      if (loadingMessage) loadingMessage.textContent = 'Сесію не знайдено або її термін завершився';
      location.replace('/admin-login.html');
      throw new Error('AUTH_REQUIRED');
    }
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
    if (!response.ok) throw new Error(data.error || `HTTP_${response.status}`);
    return data;
  } finally {
    updateApiLoading(-1);
  }
}

async function refreshDashboard() {
  state.dashboard = await api('/api/dashboard');
  renderBadges();
  renderStats();
  renderActivity();
  renderAttention();
  renderDashboardLeads();
}

async function loadCollection(type) {
  state[type] = await api(`/api/${type}`);
  return state[type];
}

async function loadAll() {
  const results = await Promise.allSettled(collections.map(loadCollection));
  const failed = results.map((result, index) => result.status === 'rejected' ? collections[index] : null).filter(Boolean);
  await refreshDashboard();
  renderLeads();
  renderReviews();
  renderQuestions();
  renderFaqs();
  renderProjects();
  renderArticles();
  renderEquipment();
  renderUsers();
  await loadIntegrationStatus();
  if (failed.length) showApiNotice(`Не завантажено: ${failed.join(', ')}. Перезапустіть локальний сервер або розгорніть актуальну версію API.`);
  document.body.classList.remove('is-loading');
}

function setBusy(button, busy, doneText = '') {
  if (!button) return;
  if (busy) button.dataset.label = button.textContent;
  button.classList.toggle('is-busy', busy);
  button.disabled = busy;
  if (!busy && doneText) {
    button.textContent = doneText;
    setTimeout(() => { button.textContent = button.dataset.label || button.textContent; }, 1400);
  }
}

function emptyState(title, text) { return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div>`; }

function showApiNotice(message) {
  const notice = $('.admin-notice');
  if (!notice) return;
  notice.innerHTML = `<span>API</span> ${escapeHtml(message)}`;
}

async function loadIntegrationStatus() {
  const status = $('#contact-api-status');
  if (!status) return;
  try {
    const data = await api('/api/integrations/status');
    status.textContent = data.contactApi ? 'Contact API підключено' : data.contactApiConfigured ? 'Маршрут voltares ще не опубліковано' : 'Потрібна змінна CONTACT_API_URL';
    status.classList.toggle('connected', Boolean(data.notifications));
  } catch {
    status.textContent = 'Статус недоступний';
  }
}

function renderBadges() {
  const map = { leads: '#lead-badge', reviews: '#review-badge', questions: '#question-badge' };
  Object.entries(map).forEach(([type, selector]) => {
    const badge = $(selector);
    if (!badge) return;
    const count = state.dashboard[type]?.unread || 0;
    badge.textContent = count;
    badge.hidden = count === 0;
  });
}

function renderStats() {
  const stats = $('.stats-grid');
  if (!stats) return;
  stats.innerHTML = `
    <article><span>Нові заявки</span><strong>${state.dashboard.leads?.unread || 0}</strong><small>${state.dashboard.leads?.total || 0} у CRM</small><i>LIVE</i></article>
    <article><span>Відгуки без відповіді</span><strong>${state.reviews.filter(item => !String(item.reply || '').trim()).length}</strong><small>${state.dashboard.reviews?.total || 0} всього</small><i>відповідь</i></article>
    <article><span>Питання Енергокола</span><strong>${state.dashboard.questions?.unread || 0}</strong><small>${state.dashboard.questions?.total || 0} тем</small><i>форум</i></article>
    <article class="accent-stat"><span>Контент</span><strong>${state.projects.length + state.articles.length}</strong><small>об'єкти + статті</small><i>SEO</i></article>`;
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderActivity() {
  const chart = $('#activity-chart');
  const total = $('#activity-total');
  const labels = $('#activity-labels');
  if (!chart || !total || !labels) return;
  const days = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - offset));
    return { date, count: 0 };
  });
  const byDay = new Map(days.map(item => [dayKey(item.date), item]));
  state.leads.forEach(lead => {
    const created = new Date(lead.createdAt);
    const item = Number.isNaN(created.getTime()) ? null : byDay.get(dayKey(created));
    if (item) item.count += 1;
  });
  const max = Math.max(1, ...days.map(item => item.count));
  const sum = days.reduce((value, item) => value + item.count, 0);
  total.innerHTML = `${sum} <small>заявок</small>`;
  chart.innerHTML = days.map(item => `<i style="height:${Math.max(item.count ? 12 : 2, Math.round(item.count / max * 100))}%" title="${item.date.toLocaleDateString('uk-UA')}: ${item.count}"></i>`).join('');
  const label = index => days[index].date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  labels.innerHTML = `<span>${label(0)}</span><span>${label(6)}</span><span>${label(13)}</span>`;
}

function renderAttention() {
  const list = $('#attention-list');
  const count = $('#attention-count');
  if (!list || !count) return;
  const tasks = [];
  state.leads.filter(item => item.status === 'new').slice(0, 2).forEach(item => tasks.push({ view: 'leads', cls: 'urgent', title: `Передзвонити: ${item.name || 'клієнт'}`, note: `${item.phone || 'без телефону'} · ${formatDate(item.createdAt)}` }));
  const waitingReview = state.reviews.find(item => !String(item.reply || '').trim());
  if (waitingReview) tasks.push({ view: 'reviews', cls: '', title: 'Відповісти на відгук', note: `${waitingReview.name || 'Клієнт'} · ${waitingReview.rating || 5} зірок` });
  const openQuestion = state.questions.find(item => item.status === 'open' || !item.answers?.length);
  if (openQuestion) tasks.push({ view: 'questions', cls: 'warn', title: 'Відповісти в Енергоколі', note: openQuestion.title || 'Нове питання' });
  const draftFaq = state.faqs.find(item => item.status !== 'active');
  if (draftFaq) tasks.push({ view: 'faqs', cls: '', title: 'Перевірити FAQ', note: draftFaq.question || 'Чернетка FAQ' });
  count.textContent = tasks.length;
  list.innerHTML = tasks.length ? tasks.slice(0, 5).map(task => `<li><i class="${task.cls}"></i><div><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.note)}</span></div><button type="button" data-open-attention="${task.view}" aria-label="Відкрити розділ">→</button></li>`).join('') : '<li class="empty-task">Немає записів, що потребують уваги.</li>';
  $$('[data-open-attention]', list).forEach(button => button.addEventListener('click', () => openView(button.dataset.openAttention)));
}

function renderDashboardLeads() {
  const tbody = $('#dashboard-leads');
  if (!tbody) return;
  if (!state.leads.length) { tbody.innerHTML = '<tr><td colspan="6">Розділ порожній — нові заявки з’являться тут автоматично.</td></tr>'; return; }
  tbody.innerHTML = state.leads.slice(0, 5).map(lead => `
    <tr>
      <td><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.phone || lead.email || 'контакт не вказано')}</span></td>
      <td>${escapeHtml(lead.object || '—')}</td>
      <td>${escapeHtml(lead.need || '—')}</td>
      <td>${escapeHtml(lead.city || '—')}</td>
      <td>${statusBadge(lead.status)}</td>
      <td>${formatDate(lead.createdAt)}</td>
    </tr>`).join('');
}

async function openView(view) {
  $$('.admin-nav').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
  $$('.admin-view').forEach(page => page.classList.toggle('is-active', page.dataset.page === view));
  $('#view-title').textContent = titles[view];
  $('.admin-sidebar').classList.remove('is-open');
  if (unreadViews.has(view)) {
    await api('/api/admin/mark-viewed', { method: 'POST', body: JSON.stringify({ type: view }) });
    await refreshDashboard();
  }
}

function renderLeads() {
  const tbody = $('#leads-table');
  if (!tbody) return;
  const query = ($('#lead-search')?.value || '').toLowerCase();
  const status = $('#lead-status-filter')?.value || 'all';
  const items = state.leads.filter(lead => {
    const haystack = [lead.name, lead.phone, lead.email, lead.city, lead.need, lead.object].join(' ').toLowerCase();
    return (!query || haystack.includes(query)) && (status === 'all' || lead.status === status);
  });
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="7">Розділ порожній або немає збігів за фільтром.</td></tr>'; return; }
  tbody.innerHTML = items.map(lead => `
    <tr data-id="${lead._id}">
      <td>#${escapeHtml(lead._id).slice(0, 8)}<span>${formatDate(lead.createdAt)}</span></td>
      <td><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.phone || lead.email || '—')}</span></td>
      <td>${escapeHtml(lead.object || '—')} · ${escapeHtml(lead.city || '—')}</td>
      <td>${escapeHtml(lead.need || lead.comment || '—')}</td>
      <td><strong>${escapeHtml(lead.manager || 'ще ніхто')}</strong><span>Перевірив: ${escapeHtml(lead.checkedBy || 'ще не перевірено')}</span></td>
      <td>${statusBadge(lead.status || 'new', true)}</td>
      <td><div class="lead-actions"><button class="secondary-admin lead-edit" type="button">Змінити</button><button class="secondary-admin danger-admin lead-delete" type="button">Видалити</button></div></td>
    </tr>`).join('');
  $$('.status-cycle', tbody).forEach(button => button.addEventListener('click', async () => {
    const row = button.closest('tr');
    const lead = state.leads.find(item => String(item._id) === row.dataset.id);
    const next = statusOrder[(statusOrder.indexOf(lead.status || 'new') + 1) % statusOrder.length];
    setBusy(button, true);
    try {
      await api(`/api/leads/${lead._id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await loadCollection('leads');
      await refreshDashboard();
      renderLeads();
    } finally { if (button.isConnected) setBusy(button, false); }
  }));
  $$('.lead-edit', tbody).forEach(button => button.addEventListener('click', () => {
    const lead = state.leads.find(item => String(item._id) === button.closest('tr').dataset.id);
    openContentDialog('leads', lead);
  }));
  $$('.lead-delete', tbody).forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Видалити заявку з CRM?')) return;
    setBusy(button, true);
    await api(`/api/leads/${button.closest('tr').dataset.id}`, { method: 'DELETE' });
    await loadCollection('leads'); await refreshDashboard(); renderLeads();
  }));
}

function renderReviews() {
  const list = $('#moderation-list');
  if (!list) return;
  const filter = $('#review-filter')?.value || 'all';
  const items = state.reviews.filter(item => {
    if (filter === 'verified') return item.verified === true;
    if (filter === 'unverified') return item.verified !== true;
    return filter === 'all' || item.status === filter;
  });
  if (!items.length) { list.innerHTML = emptyState('Розділ порожній', 'Нові відгуки з’являться тут після відправлення клієнтом.'); return; }
  list.innerHTML = items.map(item => {
    const initials = (item.name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    const audit = Array.isArray(item.audit) ? item.audit.filter(entry => entry.field === 'verified').slice(-4).reverse() : [];
    const verificationText = item.verified ? `<small class="review-verified is-verified">Ким перевірено: ${escapeHtml(item.verifiedBy || 'адмін')} · ${formatDate(item.verifiedAt)}</small>` : '';
    return `<article class="moderation-item" data-id="${item._id}">
      <div class="moderation-avatar">${escapeHtml(initials)}</div>
      <div><span class="view-caption">${'★'.repeat(Number(item.rating || 5))} · ${escapeHtml(statusLabels[item.status]?.[0] || item.status)}</span><h3>${escapeHtml(item.name)}</h3><p>«${escapeHtml(item.text)}»</p><small>${escapeHtml(item.city || 'Місто не вказано')} · ${formatDate(item.createdAt)}</small>${verificationText}${audit.length ? `<ul class="review-audit">${audit.map(entry => `<li><b>${escapeHtml(entry.user || 'admin')}</b> змінив ${escapeHtml(entry.field || 'поле')} · ${formatDate(entry.at)}</li>`).join('')}</ul>` : ''}</div>
      <div class="review-editor"><textarea rows="3" placeholder="Відповідь компанії">${escapeHtml(item.reply || '')}</textarea><div><button class="secondary-admin review-hide" type="button">Приховати</button><button class="primary-admin review-publish" type="button">${item.status === 'published' ? 'Оновити відповідь' : 'Відповісти й перевірити'}</button><button class="secondary-admin danger-admin review-delete" type="button">Видалити</button></div><small class="operation-note" aria-live="polite"></small></div>
    </article>`;
  }).join('');
  $$('.review-publish', list).forEach(button => button.addEventListener('click', async () => {
    const card = button.closest('.moderation-item');
    const reply = $('textarea', card).value.trim();
    if (!reply) {
      $('textarea', card).focus();
      button.textContent = 'Напишіть відповідь';
      setTimeout(() => { button.textContent = 'Відповісти'; }, 1600);
      return;
    }
    setBusy(button, true);
    await api(`/api/reviews/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ reply, status: 'published', verified: true }) });
    await loadCollection('reviews');
    await refreshDashboard();
    renderReviews();
  }));
  $$('.review-hide', list).forEach(button => button.addEventListener('click', async () => {
    const card = button.closest('.moderation-item');
    await api(`/api/reviews/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'hidden' }) });
    await loadCollection('reviews');
    await refreshDashboard();
    renderReviews();
  }));
  $$('.review-delete', list).forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Остаточно видалити відгук?')) return;
    setBusy(button, true);
    await api(`/api/reviews/${button.closest('.moderation-item').dataset.id}`, { method: 'DELETE' });
    await loadCollection('reviews'); await refreshDashboard(); renderReviews();
  }));
}

function renderQuestions() {
  const list = $('#question-list');
  if (!list) return;
  if (!state.questions.length) { list.innerHTML = emptyState('Питань поки немає', 'Відвідувачі можуть поставити перше питання на сайті.'); return; }
  list.innerHTML = state.questions.map(item => `
    <article class="question-item" data-id="${item._id}">
      <div><span class="view-caption">${escapeHtml(item.author || 'Гість')} · ${escapeHtml(item.city || 'Україна')} · ${formatDate(item.createdAt)}</span>
        <input class="question-title" value="${escapeHtml(item.title)}">
        <textarea class="question-answer" rows="3" placeholder="Відповідь інженера">${escapeHtml(item.answers?.find(answer => answer.role === 'engineer')?.text || '')}</textarea>
      </div>
      <aside>
        <label>Статус<select class="question-status"><option value="open">Відкрите</option><option value="discussion">Обговорення</option><option value="answered">Є відповідь інженера</option></select></label>
        <small>${Number(item.likes || 0)} корисно</small>
        <button class="primary-admin question-save" type="button">Відповісти</button>
        <button class="secondary-admin danger-admin question-delete" type="button">Видалити</button>
      </aside>
    </article>`).join('');
  $$('.question-item').forEach(card => {
    const item = state.questions.find(q => String(q._id) === card.dataset.id);
    $('.question-status', card).value = item.status || 'open';
    $('.question-save', card).addEventListener('click', async () => {
      const answer = $('.question-answer', card).value.trim();
      const communityAnswers = (item.answers || []).filter(entry => entry.role !== 'engineer');
      const payload = {
        title: $('.question-title', card).value.trim(),
        status: answer ? 'answered' : $('.question-status', card).value,
        answers: answer ? [...communityAnswers, { author: currentAdmin?.name || 'ІНК', role: 'engineer', text: answer, createdAt: new Date().toISOString() }] : communityAnswers
      };
      await api(`/api/questions/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await loadCollection('questions');
      await refreshDashboard();
      renderQuestions();
    });
    $('.question-delete', card).addEventListener('click', async () => {
      if (!confirm('Видалити питання з Енергокола?')) return;
      await api(`/api/questions/${card.dataset.id}`, { method: 'DELETE' });
      await loadCollection('questions');
      await refreshDashboard();
      renderQuestions();
    });
  });
}

function renderFaqs() {
  const list = $('#faq-admin-list');
  if (!list) return;
  const sorted = state.faqs.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  if (!sorted.length) { list.innerHTML = emptyState('FAQ порожній', 'Додайте перше коротке питання кнопкою вище.'); return; }
  list.innerHTML = sorted.map((item, index) => `
    <article class="question-item" data-id="${escapeHtml(String(item._id))}">
      <div><span class="view-caption">ПОЗИЦІЯ ${index + 1} З ${sorted.length}</span>
        <input class="faq-admin-question question-title" value="${escapeHtml(item.question || '')}" placeholder="Питання">
        <textarea class="faq-admin-answer question-answer" rows="4" placeholder="Коротка відповідь">${escapeHtml(item.answer || '')}</textarea>
      </div>
      <aside>
        <label>Змінити позицію<div class="faq-order-controls"><button class="secondary-admin faq-up" type="button" ${index === 0 ? 'disabled' : ''} aria-label="Перемістити вище">↑</button><button class="secondary-admin faq-down" type="button" ${index === sorted.length - 1 ? 'disabled' : ''} aria-label="Перемістити нижче">↓</button></div></label>
        <label>Статус<select class="faq-admin-status"><option value="active">Активний</option><option value="draft">Чернетка</option></select></label>
        <button class="primary-admin faq-admin-save" type="button">Зберегти</button>
        <button class="secondary-admin danger-admin faq-admin-delete" type="button">Видалити</button>
      </aside>
    </article>`).join('');
  $$('.question-item', list).forEach(card => {
    const item = state.faqs.find(faq => String(faq._id) === card.dataset.id);
    $('.faq-admin-status', card).value = item?.status || 'active';
    $('.faq-admin-save', card).addEventListener('click', async () => {
      const payload = {
        question: $('.faq-admin-question', card).value.trim(),
        answer: $('.faq-admin-answer', card).value.trim(),
        order: Number(item?.order || 0),
        status: $('.faq-admin-status', card).value
      };
      if (!payload.question || !payload.answer) return;
      await api(`/api/faqs/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      await loadCollection('faqs');
      renderFaqs();
    });
    const move = async (direction, trigger) => {
      const index = sorted.findIndex(faq => String(faq._id) === card.dataset.id);
      const other = sorted[index + direction];
      if (!other) return;
      const currentOrder = Number(item.order || index + 1);
      const otherOrder = Number(other.order || index + direction + 1);
      setBusy(trigger, true);
      try {
        await Promise.all([
          api(`/api/faqs/${item._id}`, { method: 'PATCH', body: JSON.stringify({ order: otherOrder }) }),
          api(`/api/faqs/${other._id}`, { method: 'PATCH', body: JSON.stringify({ order: currentOrder }) })
        ]);
        await loadCollection('faqs'); renderFaqs();
      } finally { if (trigger.isConnected) setBusy(trigger, false); }
    };
    const upButton = $('.faq-up', card);
    const downButton = $('.faq-down', card);
    upButton?.addEventListener('click', () => move(-1, upButton));
    downButton?.addEventListener('click', () => move(1, downButton));
    $('.faq-admin-delete', card).addEventListener('click', async () => {
      if (!confirm('Видалити FAQ із розділу “Коротко про важливе”?')) return;
      await api(`/api/faqs/${card.dataset.id}`, { method: 'DELETE' });
      await loadCollection('faqs');
      renderFaqs();
    });
  });
}

function renderProjects() {
  const list = $('#admin-projects');
  if (!list) return;
  if (!state.projects.length) { list.innerHTML = emptyState('Розділ порожній', 'Додайте перший об’єкт із фото.'); return; }
  list.innerHTML = state.projects.map(item => `
    <article data-id="${item._id}"><img src="${escapeHtml(item.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(item.title)}"><div><b class="${item.status === 'draft' ? 'draft' : ''}">Статус: ${escapeHtml(statusLabels[item.status]?.[0] || item.status || 'Опубліковано')}</b><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.city || '—')} · ${escapeHtml(item.type || 'об’єкт')}</p><label class="inline-status">Показ на сайті<select class="project-status"><option value="published">Опубліковано</option><option value="draft">Чернетка</option></select></label><div class="project-crm-actions"><button class="edit-project" type="button">Редагувати</button><button class="delete-project danger-link" type="button">Видалити</button></div></div></article>`).join('');
  $$('.project-status', list).forEach(select => {
    const article = select.closest('article');
    const item = state.projects.find(project => String(project._id) === article.dataset.id);
    select.value = item?.status || 'published';
    select.addEventListener('change', async () => {
      await api(`/api/projects/${article.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
      await loadCollection('projects');
      renderProjects();
    });
  });
  $$('.edit-project', list).forEach(button => button.addEventListener('click', () => openContentDialog('projects', state.projects.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.delete-project', list).forEach(button => button.addEventListener('click', () => removeItem('projects', button.closest('article').dataset.id)));
}

function renderArticles() {
  const list = $('#article-list');
  if (!list) return;
  if (!state.articles.length) { list.innerHTML = emptyState('Розділ порожній', 'Додайте першу статтю для журналу.'); return; }
  list.innerHTML = state.articles.map(item => `
    <div data-id="${item._id}"><span class="content-icon">${item.images?.length ? `<small>${item.images.length} фото</small>` : escapeHtml((item.category || 'SEO').slice(0, 2).toUpperCase())}</span><section><b class="${item.status === 'draft' ? 'draft' : ''}">${escapeHtml(item.category || 'SEO')} · ${escapeHtml(statusLabels[item.status]?.[0] || item.status)}</b><h3>${escapeHtml(item.title)}</h3><p>/articles/${escapeHtml(item.slug || 'article')}.html · ${escapeHtml(item.excerpt || '')}</p></section><button class="edit-article" type="button">Редагувати</button><button class="delete-article danger-link" type="button">Видалити</button></div>`).join('');
  $$('.edit-article', list).forEach(button => button.addEventListener('click', () => openContentDialog('articles', state.articles.find(item => String(item._id) === button.closest('div').dataset.id))));
  $$('.delete-article', list).forEach(button => button.addEventListener('click', () => removeItem('articles', button.closest('div').dataset.id)));
}

function renderEquipment() {
  const list = $('#equipment-list');
  if (!list) return;
  if (!state.equipment.length) { list.innerHTML = emptyState('Каталог порожній', 'Додайте першу модель обладнання.'); return; }
  list.innerHTML = state.equipment.map(item => `
    <article data-id="${item._id}"><span>${escapeHtml(item.brand)}</span><h3>${escapeHtml(item.model)}</h3><p>${escapeHtml(item.power || '—')} · ${escapeHtml(item.phase || '—')} · ${escapeHtml(item.voltage || '—')}</p><small>${item.images?.length || (item.image ? 1 : 0)} фото</small><div>${statusBadge(item.status || 'active')}<button class="edit-equipment" type="button">Налаштувати</button><button class="delete-equipment danger-link" type="button">Видалити</button></div></article>`).join('');
  $$('.edit-equipment', list).forEach(button => button.addEventListener('click', () => openContentDialog('equipment', state.equipment.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.delete-equipment', list).forEach(button => button.addEventListener('click', () => removeItem('equipment', button.closest('article').dataset.id)));
}

function renderUsers() {
  const list = $('#user-list');
  if (!list) return;
  const canManageUsers = currentAdmin?.role === 'admin';
  if (!state.users.length) { list.innerHTML = emptyState('Користувачів немає', canManageUsers ? 'Створіть перший обліковий запис співробітника.' : 'Облікові записи співробітників ще не додано.'); return; }
  list.innerHTML = state.users.map(item => {
    const isSelf = String(item._id) === String(currentAdmin?.id) || String(item.username) === String(currentAdmin?.name);
    const roleLabel = item.role === 'admin' ? 'Основний адміністратор' : 'Співробітник компанії';
    const canEditThisAccount = canManageUsers || isSelf;
    const accessNote = !canManageUsers && !isSelf ? ' · керування доступне власнику акаунта' : '';
    return `<div data-id="${escapeHtml(String(item._id))}"><span class="content-icon">${escapeHtml((item.username || '?').slice(0,2).toUpperCase())}</span><section><b>${roleLabel} · ${escapeHtml(statusLabels[item.status]?.[0] || item.status)}</b><h3>${escapeHtml(item.username)}${isSelf ? ' · ви' : ''}</h3><p>Створено: ${formatDate(item.createdAt)} · пароль зберігається лише як захищений хеш${accessNote}</p></section><button class="edit-user" type="button" ${canEditThisAccount ? '' : 'disabled aria-label="Керування доступне лише власнику акаунта або основному адміністратору"'}>${canManageUsers ? 'Керувати' : isSelf ? 'Змінити пароль' : 'Лише власник'}</button>${canManageUsers && !isSelf ? '<button class="delete-user danger-link" type="button">Видалити</button>' : ''}</div>`;
  }).join('');
  $$('.edit-user', list).forEach(button => button.addEventListener('click', () => openContentDialog('users', state.users.find(item => String(item._id) === button.closest('div').dataset.id))));
  $$('.delete-user', list).forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Видалити користувача CRM?')) return;
    try { await api(`/api/users/${button.closest('div').dataset.id}`, {method:'DELETE'}); await loadCollection('users'); renderUsers(); }
    catch (error) { showApiNotice(`Не вдалося видалити користувача: ${error.message}`); }
  }));
}

async function removeItem(type, id) {
  if (!confirm('Видалити запис?')) return;
  await api(`/api/${type}/${id}`, { method: 'DELETE' });
  await loadCollection(type);
  await refreshDashboard();
  renderByType(type);
}

function renderByType(type) {
  ({ leads: renderLeads, reviews: renderReviews, questions: renderQuestions, faqs: renderFaqs, projects: renderProjects, articles: renderArticles, equipment: renderEquipment, users: renderUsers }[type])?.();
}

const dialog = $('#content-dialog');
const form = $('#content-form');
const dialogTitle = $('#dialog-title');
let activeType = 'projects';
let activeItem = null;

const configs = {
  leads: { title: 'заявку', fields: [['name', 'Ваше ім’я', 'text', true], ['phone', 'Телефон', 'tel', true], ['email', 'Email', 'email'], ['city', 'Місто', 'text'], ['object', 'Тип об’єкта', 'text'], ['need', 'Що потрібно?', 'text'], ['comment', 'Коментар', 'textarea'], ['status', 'Статус', 'select', false, ['new', 'work', 'calc', 'done']], ['manager', 'Хто взяв у роботу', 'text'], ['checkedBy', 'Хто перевірив', 'text']] },
  questions: { title: 'питання та відповідь', fields: [['author', 'Автор питання', 'text'], ['city', 'Місто', 'text'], ['title', 'Питання', 'text', true], ['answer', 'Відповідь інженера', 'textarea']] },
  faqs: { title: 'короткий FAQ', fields: [['question', 'Питання', 'text', true], ['answer', 'Відповідь', 'textarea', true], ['status', 'Статус', 'select', false, ['active', 'draft']]] },
  projects: { title: "об'єкт", fields: [['title', 'Назва', 'text', true], ['city', 'Локація', 'text'], ['type', 'Тип об’єкта', 'text'], ['description', 'Опис', 'textarea'], ['imageFile', 'Фото об’єкта', 'file'], ['status', 'Статус', 'select', false, ['published', 'draft']]] },
  articles: { title: 'статтю', fields: [['title', 'Назва', 'text', true], ['slug', 'Адреса сторінки (латиницею, без пробілів)', 'text'], ['category', 'Категорія', 'text'], ['excerpt', 'Короткий SEO-опис', 'textarea'], ['body', 'Повний текст статті', 'textarea'], ['imageFiles', 'Фото статті (можна кілька)', 'files'], ['status', 'Статус', 'select', false, ['published', 'draft']]] },
  equipment: { title: 'модель обладнання', fields: [['brand', 'Бренд', 'text', true], ['model', 'Модель', 'text', true], ['power', 'Потужність', 'text'], ['phase', 'Фази', 'text'], ['voltage', 'Напруга', 'text'], ['price', 'Ціна / діапазон', 'text'], ['description', 'Опис для сайту', 'textarea'], ['imageFiles', 'Фото моделі (можна кілька)', 'files'], ['status', 'Статус', 'select', false, ['active', 'review', 'draft']]] },
  users: { title: 'користувача CRM', fields: [['username', "Ім'я користувача", 'text', true], ['password', 'Новий пароль (мінімум 8 символів)', 'password'], ['status', 'Доступ', 'select', false, ['active', 'disabled']]] }
};

function fieldTemplate([name, label, type, required, options = []], item = {}) {
  if (type === 'textarea') return `<label>${label}<textarea name="${name}" rows="4" ${required ? 'required' : ''}>${escapeHtml(item[name] || '')}</textarea></label>`;
  if (type === 'select') return `<label>${label}<select name="${name}">${options.map(option => `<option value="${option}" ${item[name] === option ? 'selected' : ''}>${escapeHtml(statusLabels[option]?.[0] || option)}</option>`).join('')}</select></label>`;
  if (type === 'file') return `<label>${label}<input name="${name}" type="file" accept="image/png,image/jpeg,image/webp"><small>${item.image ? `Поточне фото: ${escapeHtml(item.image)}` : 'PNG, JPG або WebP'}</small></label>`;
  if (type === 'files') return `<label>${label}<input name="${name}" type="file" accept="image/png,image/jpeg,image/webp" multiple><small>${item.images?.length ? `Збережено фото: ${item.images.length}` : 'PNG, JPG або WebP; можна вибрати кілька файлів одночасно'}</small></label>`;
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(item[name] || '')}" ${required ? 'required' : ''}></label>`;
}

function openContentDialog(type, item = null) {
  activeType = type;
  activeItem = item;
  const config = configs[type];
  const ownPasswordOnly = type === 'users' && currentAdmin?.role !== 'admin';
  const fields = ownPasswordOnly ? [['password', 'Новий пароль (мінімум 8 символів)', 'password', true]] : config.fields;
  dialog.dataset.type = type;
  dialogTitle.textContent = ownPasswordOnly ? 'Змінити власний пароль' : `${item ? 'Редагувати' : 'Створити'}: ${config.title}`;
  form.innerHTML = `${fields.map(field => fieldTemplate(field, item || {})).join('')}<div class="dialog-actions"><button type="button" class="secondary-admin dialog-cancel">Скасувати</button><button type="submit" class="primary-admin">${ownPasswordOnly ? 'Змінити пароль' : item ? 'Зберегти зміни' : 'Створити'}</button></div>`;
  if (type === 'users') {
    const password = form.querySelector('input[name="password"]');
    password.required = ownPasswordOnly || !item;
    password.placeholder = ownPasswordOnly ? 'Щонайменше 8 символів' : item ? 'Залиште порожнім, щоб не змінювати' : 'Щонайменше 8 символів';
  }
  $('.dialog-cancel', form).addEventListener('click', () => dialog.close());
  dialog.showModal();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (activeType === 'faqs' && !activeItem) data.order = Math.max(0, ...state.faqs.map(item => Number(item.order || 0))) + 1;
  if (activeType === 'articles') {
    const slug = String(data.slug || data.title || '').toLowerCase().trim().replace(/[^a-z0-9а-яіїєґ]+/gi, '-').replace(/^-|-$/g, '');
    data.slug = slug || `article-${Date.now()}`;
  }
  if (activeType === 'questions') {
    const answer = String(data.answer || '').trim();
    delete data.answer;
    data.author = String(data.author || '').trim() || currentAdmin?.name || 'ІНК';
    data.city = String(data.city || '').trim() || 'Україна';
    data.status = answer ? 'answered' : 'open';
    data.likes = 0;
    data.answers = answer ? [{ author: currentAdmin?.name || 'ІНК', role: 'engineer', text: answer, createdAt: new Date().toISOString() }] : [];
  }
  if (activeType === 'users' && !String(data.password || '').trim()) delete data.password;
  const fileInput = form.querySelector('input[type="file"]');
  const files = [...(fileInput?.files || [])];
  const file = files[0];
  delete data.imageFile;
  delete data.imageFiles;
  if (files.length) {
    const images = [];
    for (const selectedFile of files) {
      const upload = await api('/api/uploads', { method: 'POST', body: JSON.stringify({ dataUrl: await fileToDataUrl(selectedFile) }) });
      images.push(upload.url);
    }
    data.images = images;
    data.image = images[0];
  } else if (activeItem?.image) {
    data.image = activeItem.image;
    if (activeItem.images) data.images = activeItem.images;
  }
  const path = activeItem ? `/api/${activeType}/${activeItem._id}` : `/api/${activeType}`;
  try {
    await api(path, { method: activeItem ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    await loadCollection(activeType);
    await refreshDashboard();
    renderByType(activeType);
    dialog.close();
  } catch (error) {
    showApiNotice(error.message === 'API_NOT_FOUND' ? 'Маршрут FAQ відсутній у запущеній версії сервера. Перезапустіть npm start або зробіть новий deploy.' : `Помилка збереження: ${error.message}`);
  }
});

$$('.admin-nav').forEach(button => button.addEventListener('click', () => openView(button.dataset.view)));
$$('[data-open-view]').forEach(button => button.addEventListener('click', () => openView(button.dataset.openView)));
$('.admin-menu')?.addEventListener('click', () => $('.admin-sidebar').classList.toggle('is-open'));
$('#review-filter')?.addEventListener('change', renderReviews);
$('#lead-search')?.addEventListener('input', renderLeads);
$('#lead-status-filter')?.addEventListener('change', renderLeads);
$('#add-lead')?.addEventListener('click', () => openContentDialog('leads'));
$('#add-question')?.addEventListener('click', () => openContentDialog('questions'));
$('#add-faq')?.addEventListener('click', () => openContentDialog('faqs'));
$('#add-project')?.addEventListener('click', () => openContentDialog('projects'));
$('#add-article')?.addEventListener('click', () => openContentDialog('articles'));
$('#add-equipment')?.addEventListener('click', () => openContentDialog('equipment'));
$('#add-user')?.addEventListener('click', () => openContentDialog('users'));
$('.dialog-x')?.addEventListener('click', () => dialog.close());
$('.save-settings')?.addEventListener('click', event => {
  event.currentTarget.textContent = 'Збережено ✓';
  setTimeout(() => { event.currentTarget.textContent = 'Зберегти зміни'; }, 1600);
});
async function endAdminSession() {
  try { await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) }); }
  finally { location.href = '/admin-login.html'; }
}
$('#logout')?.addEventListener('click', endAdminSession);

api('/api/auth/me')
  .then(data => {
    currentAdmin = data.user;
    $$('[data-admin-shell]').forEach(element => { element.hidden = false; });
    const loadingTitle = $('#admin-loading-title');
    const loadingMessage = $('#admin-loading-message');
    if (loadingTitle) loadingTitle.textContent = 'Синхронізуємо CRM';
    if (loadingMessage) loadingMessage.textContent = 'Завантажуємо актуальні дані з бази';
    const userName = $('.admin-user strong');
    const userRole = $('.admin-user small');
    const addUser = $('#add-user');
    const usersHelp = $('#users-help');
    if (userName) userName.textContent = currentAdmin?.name || 'Admin';
    if (userRole) userRole.textContent = currentAdmin?.role === 'admin' ? 'Основний адміністратор' : 'Співробітник компанії';
    if (addUser) addUser.hidden = currentAdmin?.role !== 'admin';
    if (usersHelp && currentAdmin?.role !== 'admin') usersHelp.textContent = 'Ви бачите склад команди, але можете змінити пароль лише власного акаунта. Керування іншими обліковими записами доступне основному адміністратору.';
    return loadAll();
  })
  .catch(error => {
    if (error.message !== 'AUTH_REQUIRED') {
      const loadingTitle = $('#admin-loading-title');
      const loadingMessage = $('#admin-loading-message');
      const loginLink = $('#admin-loading-login');
      if (loadingTitle) loadingTitle.textContent = 'Не вдалося перевірити доступ';
      if (loadingMessage) loadingMessage.textContent = `Помилка API: ${error.message}`;
      if (loginLink) loginLink.hidden = false;
      document.body.classList.add('auth-error');
    }
  })
  .finally(() => {
    if (!document.body.classList.contains('auth-error') && !document.body.classList.contains('auth-redirecting')) document.body.classList.remove('is-loading');
  });
