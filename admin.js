const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  leads: [],
  reviews: [],
  questions: [],
  projects: [],
  articles: [],
  equipment: [],
  dashboard: {}
};

const titles = {
  dashboard: 'Огляд',
  leads: 'Заявки',
  reviews: 'Відгуки',
  questions: 'Питання',
  projects: "Об'єкти",
  articles: 'Статті',
  equipment: 'Обладнання',
  settings: 'Налаштування'
};

const collections = ['leads', 'reviews', 'questions', 'projects', 'articles', 'equipment'];
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
  review: ['На перевірці', 'status-work']
};

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
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (response.status === 401) {
    location.href = '/admin-login.html';
    throw new Error('AUTH_REQUIRED');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'API_ERROR');
  return data;
}

async function refreshDashboard() {
  state.dashboard = await api('/api/dashboard');
  renderBadges();
  renderStats();
  renderDashboardLeads();
}

async function loadCollection(type) {
  state[type] = await api(`/api/${type}`);
  return state[type];
}

async function loadAll() {
  await Promise.all(collections.map(loadCollection));
  await refreshDashboard();
  renderLeads();
  renderReviews();
  renderQuestions();
  renderProjects();
  renderArticles();
  renderEquipment();
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
    <article><span>Відгуки без відповіді</span><strong>${state.reviews.filter(item => item.status === 'waiting').length}</strong><small>${state.dashboard.reviews?.total || 0} всього</small><i>модерація</i></article>
    <article><span>Питання Енергокола</span><strong>${state.dashboard.questions?.unread || 0}</strong><small>${state.dashboard.questions?.total || 0} тем</small><i>форум</i></article>
    <article class="accent-stat"><span>Контент</span><strong>${state.projects.length + state.articles.length}</strong><small>об'єкти + статті</small><i>SEO</i></article>`;
}

function renderDashboardLeads() {
  const tbody = $('#dashboard-leads');
  if (!tbody) return;
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
  tbody.innerHTML = items.map(lead => `
    <tr data-id="${lead._id}">
      <td>#${escapeHtml(lead._id).slice(0, 8)}<span>${formatDate(lead.createdAt)}</span></td>
      <td><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.phone || lead.email || '—')}</span></td>
      <td>${escapeHtml(lead.object || '—')} · ${escapeHtml(lead.city || '—')}</td>
      <td>${escapeHtml(lead.need || lead.comment || '—')}</td>
      <td>${escapeHtml(lead.manager || '—')}</td>
      <td>${statusBadge(lead.status || 'new', true)}</td>
    </tr>`).join('');
  $$('.status-cycle', tbody).forEach(button => button.addEventListener('click', async () => {
    const row = button.closest('tr');
    const lead = state.leads.find(item => String(item._id) === row.dataset.id);
    const next = statusOrder[(statusOrder.indexOf(lead.status || 'new') + 1) % statusOrder.length];
    await api(`/api/leads/${lead._id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    await loadCollection('leads');
    await refreshDashboard();
    renderLeads();
  }));
}

function renderReviews() {
  const list = $('#moderation-list');
  if (!list) return;
  const filter = $('#review-filter')?.value || 'all';
  const items = state.reviews.filter(item => filter === 'all' || item.status === filter);
  list.innerHTML = items.map(item => {
    const initials = (item.name || '?').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    return `<article class="moderation-item" data-id="${item._id}">
      <div class="moderation-avatar">${escapeHtml(initials)}</div>
      <div><span class="view-caption">${'★'.repeat(Number(item.rating || 5))} · ${escapeHtml(statusLabels[item.status]?.[0] || item.status)}</span><h3>${escapeHtml(item.name)}</h3><p>«${escapeHtml(item.text)}»</p><small>${escapeHtml(item.city || 'Місто не вказано')} · ${formatDate(item.createdAt)}</small></div>
      <div class="review-editor"><textarea rows="3" placeholder="Відповідь компанії">${escapeHtml(item.reply || '')}</textarea><div><button class="secondary-admin review-hide" type="button">Приховати</button><button class="primary-admin review-publish" type="button">Зберегти відповідь</button></div></div>
    </article>`;
  }).join('');
  $$('.review-publish', list).forEach(button => button.addEventListener('click', async () => {
    const card = button.closest('.moderation-item');
    await api(`/api/reviews/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ reply: $('textarea', card).value, status: 'published' }) });
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
}

function renderQuestions() {
  const list = $('#question-list');
  if (!list) return;
  list.innerHTML = state.questions.map(item => `
    <article class="question-item" data-id="${item._id}">
      <div><span class="view-caption">${escapeHtml(item.author || 'Гість')} · ${escapeHtml(item.city || 'Україна')} · ${formatDate(item.createdAt)}</span>
        <input class="question-title" value="${escapeHtml(item.title)}">
        <textarea class="question-body" rows="2" placeholder="Опис питання">${escapeHtml(item.body || '')}</textarea>
        <textarea class="question-answer" rows="3" placeholder="Відповідь інженера">${escapeHtml(item.answers?.[0]?.text || '')}</textarea>
      </div>
      <aside>
        <label>Статус<select class="question-status"><option value="open">Відкрите</option><option value="answered">Є відповідь</option></select></label>
        <small>${Number(item.likes || 0)} корисно</small>
        <button class="primary-admin question-save" type="button">Зберегти</button>
        <button class="secondary-admin danger-admin question-delete" type="button">Видалити</button>
      </aside>
    </article>`).join('');
  $$('.question-item').forEach(card => {
    const item = state.questions.find(q => String(q._id) === card.dataset.id);
    $('.question-status', card).value = item.status || 'open';
    $('.question-save', card).addEventListener('click', async () => {
      const answer = $('.question-answer', card).value.trim();
      const payload = {
        title: $('.question-title', card).value.trim(),
        body: $('.question-body', card).value.trim(),
        status: $('.question-status', card).value,
        answers: answer ? [{ author: 'ІНК', role: 'engineer', text: answer, createdAt: new Date().toISOString() }] : []
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

function renderProjects() {
  const list = $('#admin-projects');
  if (!list) return;
  list.innerHTML = state.projects.map(item => `
    <article data-id="${item._id}"><img src="${escapeHtml(item.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(item.title)}"><div><b class="${item.status === 'draft' ? 'draft' : ''}">${escapeHtml(statusLabels[item.status]?.[0] || item.status)}</b><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.city || '—')} · ${escapeHtml(item.type || 'об’єкт')}</p><button class="edit-project" type="button">Редагувати</button><button class="delete-project danger-link" type="button">Видалити</button></div></article>`).join('');
  $$('.edit-project', list).forEach(button => button.addEventListener('click', () => openContentDialog('projects', state.projects.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.delete-project', list).forEach(button => button.addEventListener('click', () => removeItem('projects', button.closest('article').dataset.id)));
}

function renderArticles() {
  const list = $('#article-list');
  if (!list) return;
  list.innerHTML = state.articles.map(item => `
    <div data-id="${item._id}"><span class="content-icon">${escapeHtml((item.category || 'SEO').slice(0, 2).toUpperCase())}</span><section><b class="${item.status === 'draft' ? 'draft' : ''}">${escapeHtml(item.category || 'SEO')} · ${escapeHtml(statusLabels[item.status]?.[0] || item.status)}</b><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.url || '/' + (item.slug || 'article'))} · ${escapeHtml(item.excerpt || '')}</p></section><button class="edit-article" type="button">Редагувати</button><button class="delete-article danger-link" type="button">Видалити</button></div>`).join('');
  $$('.edit-article', list).forEach(button => button.addEventListener('click', () => openContentDialog('articles', state.articles.find(item => String(item._id) === button.closest('div').dataset.id))));
  $$('.delete-article', list).forEach(button => button.addEventListener('click', () => removeItem('articles', button.closest('div').dataset.id)));
}

function renderEquipment() {
  const list = $('#equipment-list');
  if (!list) return;
  list.innerHTML = state.equipment.map(item => `
    <article data-id="${item._id}"><span>${escapeHtml(item.brand)}</span><h3>${escapeHtml(item.model)}</h3><p>${escapeHtml(item.power || '—')} · ${escapeHtml(item.phase || '—')} · ${escapeHtml(item.voltage || '—')}</p><div>${statusBadge(item.status || 'active')}<button class="edit-equipment" type="button">Налаштувати</button><button class="delete-equipment danger-link" type="button">Видалити</button></div></article>`).join('');
  $$('.edit-equipment', list).forEach(button => button.addEventListener('click', () => openContentDialog('equipment', state.equipment.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.delete-equipment', list).forEach(button => button.addEventListener('click', () => removeItem('equipment', button.closest('article').dataset.id)));
}

async function removeItem(type, id) {
  if (!confirm('Видалити запис?')) return;
  await api(`/api/${type}/${id}`, { method: 'DELETE' });
  await loadCollection(type);
  await refreshDashboard();
  renderByType(type);
}

function renderByType(type) {
  ({ leads: renderLeads, reviews: renderReviews, questions: renderQuestions, projects: renderProjects, articles: renderArticles, equipment: renderEquipment }[type])?.();
}

const dialog = $('#content-dialog');
const form = $('#content-form');
const dialogTitle = $('#dialog-title');
let activeType = 'projects';
let activeItem = null;

const configs = {
  leads: { title: 'заявку', fields: [['name', 'Ім’я', 'text', true], ['phone', 'Телефон', 'tel', true], ['email', 'Email', 'email'], ['city', 'Місто', 'text'], ['object', 'Об’єкт', 'text'], ['need', 'Запит', 'text'], ['comment', 'Коментар', 'textarea']] },
  projects: { title: "об'єкт", fields: [['title', 'Назва', 'text', true], ['city', 'Локація', 'text'], ['type', 'Тип об’єкта', 'text'], ['description', 'Опис', 'textarea'], ['imageFile', 'Фото об’єкта', 'file'], ['status', 'Статус', 'select', false, ['published', 'draft']]] },
  articles: { title: 'статтю', fields: [['title', 'Назва', 'text', true], ['slug', 'Slug', 'text'], ['url', 'URL', 'text'], ['category', 'Категорія', 'text'], ['excerpt', 'SEO-опис', 'textarea'], ['body', 'Текст / нотатки', 'textarea'], ['status', 'Статус', 'select', false, ['published', 'draft']]] },
  equipment: { title: 'модель обладнання', fields: [['brand', 'Бренд', 'text', true], ['model', 'Модель', 'text', true], ['power', 'Потужність', 'text'], ['phase', 'Фази', 'text'], ['voltage', 'Напруга', 'text'], ['status', 'Статус', 'select', false, ['active', 'review', 'draft']]] }
};

function fieldTemplate([name, label, type, required, options = []], item = {}) {
  if (type === 'textarea') return `<label>${label}<textarea name="${name}" rows="4" ${required ? 'required' : ''}>${escapeHtml(item[name] || '')}</textarea></label>`;
  if (type === 'select') return `<label>${label}<select name="${name}">${options.map(option => `<option value="${option}" ${item[name] === option ? 'selected' : ''}>${escapeHtml(statusLabels[option]?.[0] || option)}</option>`).join('')}</select></label>`;
  if (type === 'file') return `<label>${label}<input name="${name}" type="file" accept="image/png,image/jpeg,image/webp"><small>${item.image ? `Поточне фото: ${escapeHtml(item.image)}` : 'PNG, JPG або WebP'}</small></label>`;
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(item[name] || '')}" ${required ? 'required' : ''}></label>`;
}

function openContentDialog(type, item = null) {
  activeType = type;
  activeItem = item;
  const config = configs[type];
  dialogTitle.textContent = `${item ? 'Редагувати' : 'Створити'}: ${config.title}`;
  form.innerHTML = `${config.fields.map(field => fieldTemplate(field, item || {})).join('')}<div class="dialog-actions"><button type="button" class="secondary-admin dialog-cancel">Скасувати</button><button type="submit" class="primary-admin">${item ? 'Зберегти зміни' : 'Створити'}</button></div>`;
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
  const file = form.querySelector('input[type="file"]')?.files?.[0];
  delete data.imageFile;
  if (file) {
    const upload = await api('/api/uploads', { method: 'POST', body: JSON.stringify({ dataUrl: await fileToDataUrl(file) }) });
    data.image = upload.url;
  } else if (activeItem?.image) {
    data.image = activeItem.image;
  }
  const path = activeItem ? `/api/${activeType}/${activeItem._id}` : `/api/${activeType}`;
  await api(path, { method: activeItem ? 'PATCH' : 'POST', body: JSON.stringify(data) });
  await loadCollection(activeType);
  await refreshDashboard();
  renderByType(activeType);
  dialog.close();
});

$$('.admin-nav').forEach(button => button.addEventListener('click', () => openView(button.dataset.view)));
$$('[data-open-view]').forEach(button => button.addEventListener('click', () => openView(button.dataset.openView)));
$('.admin-menu')?.addEventListener('click', () => $('.admin-sidebar').classList.toggle('is-open'));
$('#review-filter')?.addEventListener('change', renderReviews);
$('#lead-search')?.addEventListener('input', renderLeads);
$('#lead-status-filter')?.addEventListener('change', renderLeads);
$('#add-lead')?.addEventListener('click', () => openContentDialog('leads'));
$('#add-project')?.addEventListener('click', () => openContentDialog('projects'));
$('#add-article')?.addEventListener('click', () => openContentDialog('articles'));
$('#add-equipment')?.addEventListener('click', () => openContentDialog('equipment'));
$('.dialog-x')?.addEventListener('click', () => dialog.close());
$('.save-settings')?.addEventListener('click', event => {
  event.currentTarget.textContent = 'Збережено ✓';
  setTimeout(() => { event.currentTarget.textContent = 'Зберегти зміни'; }, 1600);
});
$('#logout')?.addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
  location.href = '/admin-login.html';
});

api('/api/auth/me')
  .then(loadAll)
  .catch(error => {
    if (error.message !== 'AUTH_REQUIRED') {
      $('.admin-notice')?.replaceChildren(document.createTextNode(`Помилка API: ${error.message}`));
    }
  });
