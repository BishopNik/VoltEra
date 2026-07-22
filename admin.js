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
  solarPanels: [],
  greenProtect: [],
  quotes: [],
  purchases: [],
  users: [],
  dashboard: {}
};

const titles = {
  dashboard: 'Огляд',
  leads: 'Заявки',
  quotes: 'Комерційні пропозиції',
  purchases: 'Закупівлі',
  reviews: 'Відгуки',
  questions: 'Питання',
  faqs: 'Короткі FAQ',
  projects: "Об'єкти",
  articles: 'Статті',
  equipment: 'Обладнання',
  solarPanels: 'Сонячні панелі',
  greenProtect: 'Green Protect',
  users: 'Користувачі',
  settings: 'Налаштування'
};

const collections = ['leads', 'reviews', 'questions', 'faqs', 'projects', 'articles', 'equipment', 'solarPanels', 'greenProtect', 'quotes', 'purchases', 'users'];
const unreadViews = new Set(['leads', 'reviews', 'questions']);
const statusOrder = ['new', 'work', 'calc', 'done'];
const selectedLeadIds = new Set();
let visibleLeadIds = [];
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
  auto: ['Автоматично', 'status-work'],
  featured: ['Закріплено', 'status-done'],
  sent: ['Надіслано', 'status-done'],
  accepted: ['Підтверджено клієнтом', 'status-done'],
  completed: ['Реалізовано', 'status-done'],
  declined: ['Відхилено', 'status-calc'],
  planned: ['Заплановано', 'status-calc'],
  ordered: ['Замовлено', 'status-work'],
  received: ['Отримано', 'status-done'],
  cancelled: ['Скасовано', 'status-calc'],
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

function formatMoney(value, currency = 'UAH') {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: currency === 'USD' ? 'USD' : currency === 'EUR' ? 'EUR' : 'UAH', maximumFractionDigits: 2 }).format(Number(value || 0));
}

function leadItemsSummary(lead = {}) {
  if (!Array.isArray(lead.items) || !lead.items.length) return escapeHtml(lead.need || lead.comment || '—');
  return `<details class="lead-kit"><summary>${lead.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)} од. у комплекті</summary><ul>${lead.items.map(item => `<li><b>${escapeHtml(item.quantity || 1)} ×</b> ${escapeHtml(item.name || 'Товар')} <small>${escapeHtml(item.price || 'За запитом')}</small></li>`).join('')}</ul>${lead.comment ? `<p>${escapeHtml(lead.comment)}</p>` : ''}<small class="email-delivery ${lead.emailCopySent ? 'is-sent' : ''}">${lead.email ? (lead.emailCopySent ? 'Копію на email надіслано' : `Email: ${escapeHtml(lead.emailCopyError || 'не надіслано')}`) : 'Email не вказано'}</small></details>`;
}

function leadTotals(lead = {}) {
  return (lead.items || []).reduce((totals, item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    totals.uah += priceNumber(item.price) * quantity;
    totals.usd += Number(item.priceUsd || 0) * quantity;
    return totals;
  }, { uah:0, usd:0 });
}

function leadItemsPanel(lead = {}) {
  const items = Array.isArray(lead.items) ? lead.items : [];
  if (!items.length) return `<section class="lead-dialog-items is-empty"><header><div><span>СКЛАД ЗАПИТУ</span><h3>Позиції не додані</h3></div></header><p>Це звичайна заявка без товарів із кошика.</p></section>`;
  const totals = leadTotals(lead);
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  return `<section class="lead-dialog-items"><header><div><span>СКЛАД КОМПЛЕКТУ</span><h3>${count} од. · ${items.length} позицій</h3></div></header><div class="lead-dialog-table"><table><thead><tr><th>№</th><th>Товар</th><th>К-сть</th><th>Ціна</th></tr></thead><tbody>${items.map((item, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(item.name || 'Товар')}</strong><small>${escapeHtml([item.power, item.phase, item.voltage].filter(Boolean).join(' · '))}</small></td><td>${escapeHtml(item.quantity || 1)}</td><td><strong>${escapeHtml(item.price || 'За запитом')}</strong>${Number(item.priceUsd || 0) > 0 ? `<small>$${escapeHtml(Number(item.priceUsd).toLocaleString('en-US'))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div><footer><span>Орієнтовна сума</span><strong>${totals.uah > 0 ? `${Math.round(totals.uah).toLocaleString('uk-UA')} грн` : 'За запитом'}${totals.usd > 0 ? ` · $${Math.round(totals.usd).toLocaleString('en-US')}` : ''}</strong></footer></section>`;
}

function openPrintDocument(markup, blockedMessage) {
  const popup = window.open('about:blank', '_blank');
  if (!popup) { showApiNotice(blockedMessage); return; }
  popup.opener = null;
  popup.document.open(); popup.document.write(markup); popup.document.close(); popup.focus();
  setTimeout(() => popup.print(), 250);
}

function openPreviewDocument(markup) {
  const popup = window.open('about:blank', '_blank');
  if (!popup) { showApiNotice('Браузер заблокував вікно попереднього перегляду. Дозвольте спливні вікна для CRM.'); return; }
  popup.opener = null;
  popup.document.open(); popup.document.write(markup); popup.document.close(); popup.focus();
}

function leadPrintDocument(lead = {}) {
  const items = Array.isArray(lead.items) ? lead.items : [];
  const totals = leadTotals(lead);
  const rows = items.map((item, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(item.name || 'Товар')}</strong><small>${escapeHtml([item.power, item.phase, item.voltage].filter(Boolean).join(' · '))}</small></td><td>${escapeHtml(item.quantity || 1)}</td><td>${escapeHtml(item.price || 'За запитом')}${Number(item.priceUsd || 0) > 0 ? `<small>$${escapeHtml(Number(item.priceUsd).toLocaleString('en-US'))}</small>` : ''}</td></tr>`).join('');
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>Заявка ${escapeHtml(String(lead._id || '').slice(-8))}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#10201a;font:13px/1.45 Arial,sans-serif}header{display:flex;justify-content:space-between;gap:24px;padding:22px;border-radius:18px;background:#0c211a;color:#f8f8ef}header b{color:#d8ef69;font-size:11px;letter-spacing:.12em}header h1{margin:8px 0 4px;font-size:28px}.meta{text-align:right;color:#c2d0ca}.client{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:22px 0;padding:16px;border:1px solid #dce1dc;border-radius:14px}.client p{margin:4px 0}table{width:100%;border-collapse:collapse}th{padding:9px 8px;border-bottom:2px solid #10201a;text-align:left;font-size:10px;text-transform:uppercase}td{padding:10px 8px;border-bottom:1px solid #dce1dc;vertical-align:top}td:first-child{width:28px;color:#74817b}td:nth-child(3),td:nth-child(4){white-space:nowrap;text-align:right}td small{display:block;color:#74817b}.total{display:flex;justify-content:flex-end;gap:20px;margin-top:18px;padding:15px;border-radius:12px;background:#f0f2ed;font-size:18px}.comment{margin-top:18px;padding:14px;border-left:4px solid #d8ef69;background:#f7f8f4}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #dce1dc;color:#74817b;font-size:11px}</style></head><body><header><div><b>VOLTARES / І.Н.К. ТОВ</b><h1>Заявка клієнта</h1><span>#${escapeHtml(String(lead._id || '').slice(-8))}</span></div><div class="meta"><div>${escapeHtml(statusLabels[lead.status]?.[0] || lead.status || 'Нова')}</div><div>${escapeHtml(formatDate(lead.createdAt))}</div></div></header><section class="client"><div><strong>Клієнт</strong><p>${escapeHtml(lead.name || 'Не вказано')}</p><p>${escapeHtml(lead.phone || '')}</p><p>${escapeHtml(lead.email || '')}</p></div><div><strong>Запит</strong><p>${escapeHtml(lead.object || '—')}</p><p>${escapeHtml(lead.need || '—')}</p><p>${escapeHtml(lead.city || '')}</p></div></section><table><thead><tr><th>№</th><th>Позиція</th><th>Кількість</th><th>Ціна</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Позиції з каталогу не додані</td></tr>'}</tbody></table>${items.length ? `<div class="total"><span>Орієнтовна сума</span><strong>${totals.uah > 0 ? `${Math.round(totals.uah).toLocaleString('uk-UA')} грн` : 'За запитом'}${totals.usd > 0 ? ` · $${Math.round(totals.usd).toLocaleString('en-US')}` : ''}</strong></div>` : ''}${lead.comment ? `<div class="comment"><strong>Коментар клієнта</strong><p>${escapeHtml(lead.comment)}</p></div>` : ''}<div class="footer">Voltares · І.Н.К. ТОВ · +38 067 672 18 52 · ink.torg@gmail.com</div></body></html>`;
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
  renderSolarPanels();
  renderGreenProtect();
  renderQuotes();
  renderPurchases();
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
    const email = $('#email-api-status');
    if (email) { email.textContent = data.email ? 'Resend підключено' : 'Потрібен RESEND_API_KEY'; email.classList.toggle('connected', Boolean(data.email)); }
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
  try {
    if (view === 'dashboard') await refreshDashboard();
    else if (collections.includes(view)) { await loadCollection(view); renderByType(view); }
  } catch (error) { showApiNotice(`Не вдалося оновити розділ: ${error.message}`); }
  if (unreadViews.has(view)) {
    await api('/api/admin/mark-viewed', { method: 'POST', body: JSON.stringify({ type: view }) });
    await refreshDashboard();
  }
}

let crmPollBusy = false;
function startCrmPolling() {
  setInterval(async () => {
    if (document.hidden || crmPollBusy || pendingApiRequests) return;
    crmPollBusy = true;
    try {
      await Promise.all(['leads', 'reviews', 'questions'].map(loadCollection));
      const activeView = $('.admin-view.is-active')?.dataset.page;
      if (['leads', 'reviews', 'questions'].includes(activeView)) renderByType(activeView);
      await refreshDashboard();
    } catch {} finally { crmPollBusy = false; }
  }, 25000);
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
  visibleLeadIds = items.map(lead => String(lead._id));
  const availableIds = new Set(state.leads.map(lead => String(lead._id)));
  [...selectedLeadIds].forEach(id => { if (!availableIds.has(id)) selectedLeadIds.delete(id); });
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="8">Розділ порожній або немає збігів за фільтром.</td></tr>'; updateLeadSelectionUi(); return; }
  tbody.innerHTML = items.map(lead => `
    <tr data-id="${lead._id}">
      <td class="lead-select-cell"><input class="lead-select-checkbox lead-select" type="checkbox" aria-label="Вибрати заявку ${escapeHtml(String(lead._id).slice(0,8))}" ${selectedLeadIds.has(String(lead._id)) ? 'checked' : ''}></td>
      <td>#${escapeHtml(lead._id).slice(0, 8)}<span>${formatDate(lead.createdAt)}</span></td>
      <td><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.phone || lead.email || '—')}</span></td>
      <td>${escapeHtml(lead.object || '—')} · ${escapeHtml(lead.city || '—')}</td>
      <td>${leadItemsSummary(lead)}</td>
      <td><strong>${escapeHtml(lead.manager || 'ще ніхто')}</strong><span>Перевірив: ${escapeHtml(lead.checkedBy || 'ще не перевірено')}</span></td>
      <td>${statusBadge(lead.status || 'new', true)}</td>
      <td><div class="lead-actions"><button class="secondary-admin lead-quote" type="button">Створити КП</button><button class="secondary-admin lead-edit" type="button">Змінити</button><button class="secondary-admin danger-admin lead-delete" type="button">Видалити</button></div></td>
    </tr>`).join('');
  $$('.lead-select', tbody).forEach(input => input.addEventListener('change', () => {
    const id = input.closest('tr').dataset.id;
    if (input.checked) selectedLeadIds.add(id); else selectedLeadIds.delete(id);
    updateLeadSelectionUi();
  }));
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
  $$('.lead-quote', tbody).forEach(button => button.addEventListener('click', () => {
    const lead = state.leads.find(item => String(item._id) === button.closest('tr').dataset.id);
    if (lead) openQuoteFromLead(lead);
  }));
  $$('.lead-delete', tbody).forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Видалити заявку з CRM?')) return;
    setBusy(button, true);
    await api(`/api/leads/${button.closest('tr').dataset.id}`, { method: 'DELETE' });
    await loadCollection('leads'); await refreshDashboard(); renderLeads();
  }));
  updateLeadSelectionUi();
}

function updateLeadSelectionUi() {
  const selectAll = $('#lead-select-all');
  const bulkButton = $('#lead-bulk-delete');
  const count = $('#lead-selected-count');
  const visibleSelected = visibleLeadIds.filter(id => selectedLeadIds.has(id)).length;
  if (selectAll) {
    selectAll.checked = visibleLeadIds.length > 0 && visibleSelected === visibleLeadIds.length;
    selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visibleLeadIds.length;
  }
  if (count) count.textContent = String(selectedLeadIds.size);
  if (bulkButton) bulkButton.disabled = selectedLeadIds.size === 0;
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
    try {
      await api(`/api/reviews/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ reply, status: 'published', verified: true }) });
      await loadCollection('reviews');
      await refreshDashboard();
      renderReviews();
    } catch (error) {
      showApiNotice(`Не вдалося зберегти відгук: ${error.message}`);
    } finally { if (button.isConnected) setBusy(button, false); }
  }));
  $$('.review-hide', list).forEach(button => button.addEventListener('click', async () => {
    const card = button.closest('.moderation-item');
    setBusy(button, true);
    try {
      await api(`/api/reviews/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'hidden' }) });
      await loadCollection('reviews');
      await refreshDashboard();
      renderReviews();
    } catch (error) {
      showApiNotice(`Не вдалося змінити статус відгуку: ${error.message}`);
    } finally { if (button.isConnected) setBusy(button, false); }
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
    $('.question-save', card).addEventListener('click', async event => {
      const saveButton = event.currentTarget;
      const answer = $('.question-answer', card).value.trim();
      const communityAnswers = (item.answers || []).filter(entry => entry.role !== 'engineer');
      const payload = {
        title: $('.question-title', card).value.trim(),
        status: answer ? 'answered' : $('.question-status', card).value,
        answers: answer ? [...communityAnswers, { author: currentAdmin?.name || 'ІНК', role: 'engineer', text: answer, createdAt: new Date().toISOString() }] : communityAnswers
      };
      setBusy(saveButton, true);
      try {
        await api(`/api/questions/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        await loadCollection('questions');
        await refreshDashboard();
        renderQuestions();
      } catch (error) {
        showApiNotice(`Не вдалося зберегти відповідь: ${error.message}`);
      } finally { if (saveButton.isConnected) setBusy(saveButton, false); }
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
    $('.faq-admin-save', card).addEventListener('click', async event => {
      const saveButton = event.currentTarget;
      const payload = {
        question: $('.faq-admin-question', card).value.trim(),
        answer: $('.faq-admin-answer', card).value.trim(),
        order: Number(item?.order || 0),
        status: $('.faq-admin-status', card).value
      };
      if (!payload.question || !payload.answer) return;
      setBusy(saveButton, true);
      try {
        await api(`/api/faqs/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        await loadCollection('faqs');
        renderFaqs();
      } catch (error) {
        showApiNotice(`Не вдалося зберегти FAQ: ${error.message}`);
      } finally { if (saveButton.isConnected) setBusy(saveButton, false); }
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
      select.disabled = true;
      try {
        await api(`/api/projects/${article.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
        await loadCollection('projects');
        renderProjects();
      } catch (error) {
        showApiNotice(`Не вдалося змінити статус об’єкта: ${error.message}`);
      } finally { if (select.isConnected) select.disabled = false; }
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

function equipmentHomeOrder(items = []) {
  const eligible = items.filter(item => item.status === 'active' && (item.homeMode || 'auto') !== 'hidden');
  const featured = eligible.filter(item => item.homeMode === 'featured').sort((a, b) => Number(a.homeOrder || Number.MAX_SAFE_INTEGER) - Number(b.homeOrder || Number.MAX_SAFE_INTEGER));
  const automatic = eligible.filter(item => item.homeMode !== 'featured').sort((a, b) => Number(b.views || 0) - Number(a.views || 0) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return [...featured, ...automatic];
}

async function moveEquipmentHome(itemId, direction, button) {
  const featured = state.equipment.filter(item => item.homeMode === 'featured').sort((a, b) => Number(a.homeOrder || Number.MAX_SAFE_INTEGER) - Number(b.homeOrder || Number.MAX_SAFE_INTEGER));
  const index = featured.findIndex(item => String(item._id) === String(itemId));
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= featured.length) return;
  const current = featured[index];
  const target = featured[targetIndex];
  const currentOrder = Number(current.homeOrder || index + 1);
  const targetOrder = Number(target.homeOrder || targetIndex + 1);
  setBusy(button, true);
  try {
    await Promise.all([
      api(`/api/equipment/${current._id}`, { method:'PATCH', body:JSON.stringify({ homeOrder:targetOrder }) }),
      api(`/api/equipment/${target._id}`, { method:'PATCH', body:JSON.stringify({ homeOrder:currentOrder }) })
    ]);
    await loadCollection('equipment');
    renderEquipment();
  } catch (error) {
    showApiNotice(`Не вдалося змінити позицію: ${error.message}`);
  } finally { if (button.isConnected) setBusy(button, false); }
}

function renderEquipment() {
  const list = $('#equipment-list');
  if (!list) return;
  if (!state.equipment.length) { list.innerHTML = emptyState('Каталог порожній', 'Додайте першу модель обладнання.'); return; }
  const homeOrder = equipmentHomeOrder(state.equipment);
  const selectedIds = homeOrder.slice(0, 6).map(item => String(item._id));
  const featured = homeOrder.filter(item => item.homeMode === 'featured');
  const ordered = [...homeOrder, ...state.equipment.filter(item => !homeOrder.includes(item))];
  list.innerHTML = ordered.map(item => {
    const images = [...new Set([...(Array.isArray(item.images) ? item.images : []), item.image].filter(Boolean))];
    const media = images.length
      ? `<button class="equipment-admin-media" type="button" aria-label="Збільшити фото ${escapeHtml(`${item.brand || ''} ${item.model || ''}`.trim())}"><img src="${escapeHtml(images[0])}" alt="${escapeHtml(`${item.brand || ''} ${item.model || ''}`.trim())}" loading="lazy"><span>${images.length} фото</span><i aria-hidden="true">⌕</i></button>`
      : '<div class="equipment-admin-media is-empty"><span>Фото не додано</span></div>';
    const retail = [item.price, item.priceUsd ? `$${Number(item.priceUsd).toLocaleString('en-US')}` : ''].filter(Boolean).join(' · ') || 'не вказано';
    const purchase = item.purchasePrice ? `${Number(item.purchasePrice).toLocaleString('en-US')} ${item.purchaseCurrency || 'USD'}` : 'не вказано';
    const mode = item.homeMode || 'auto';
    const homeIndex = selectedIds.indexOf(String(item._id));
    const featuredIndex = featured.findIndex(entry => String(entry._id) === String(item._id));
    const homeLabel = homeIndex >= 0 ? `Головна · №${homeIndex + 1}` : mode === 'hidden' ? 'Не показується на головній' : 'Резерв автопідбору';
    return `<article data-id="${item._id}">${media}<span class="equipment-admin-brand">${escapeHtml(item.brand)}</span><h3>${escapeHtml(item.model)}</h3><p>${escapeHtml(item.power || '—')} · ${escapeHtml(item.phase || '—')} · ${escapeHtml(item.voltage || '—')}</p><p class="equipment-admin-pricing"><b>Роздріб:</b> ${escapeHtml(retail)}<br><b>Закупівля:</b> ${escapeHtml(purchase)}</p><div class="equipment-admin-home"><span><b>${escapeHtml(homeLabel)}</b><small>${escapeHtml(statusLabels[mode]?.[0] || mode)} · переглядів: ${Number(item.views || 0)}</small></span><span class="equipment-home-arrows"><button class="equipment-home-move" type="button" data-direction="-1" aria-label="Перемістити товар вище" ${mode !== 'featured' || featuredIndex <= 0 ? 'disabled' : ''}>↑</button><button class="equipment-home-move" type="button" data-direction="1" aria-label="Перемістити товар нижче" ${mode !== 'featured' || featuredIndex < 0 || featuredIndex >= featured.length - 1 ? 'disabled' : ''}>↓</button></span></div><div>${statusBadge(item.status || 'active')}<button class="edit-equipment" type="button">Налаштувати</button><button class="delete-equipment danger-link" type="button">Видалити</button></div></article>`;
  }).join('');
  $$('.equipment-admin-media img', list).forEach(image => image.addEventListener('error', () => {
    const media = image.parentElement;
    image.remove();
    media.classList.add('is-empty');
    media.querySelector('span').textContent = 'Фото недоступне';
  }, { once:true }));
  $$('.equipment-admin-media:not(.is-empty)', list).forEach(media => media.addEventListener('click', () => {
    if (media.classList.contains('is-empty')) return;
    const item = state.equipment.find(entry => String(entry._id) === media.closest('article').dataset.id);
    if (item) openEquipmentImageViewer(item);
  }));
  $$('.edit-equipment', list).forEach(button => button.addEventListener('click', () => openContentDialog('equipment', state.equipment.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.equipment-home-move', list).forEach(button => button.addEventListener('click', () => moveEquipmentHome(button.closest('article').dataset.id, Number(button.dataset.direction), button)));
  $$('.delete-equipment', list).forEach(button => button.addEventListener('click', () => removeItem('equipment', button.closest('article').dataset.id)));
}

function renderCatalogAdmin(type, selector) {
  const list = $(selector);
  if (!list) return;
  const items = state[type] || [];
  if (!items.length) { list.innerHTML = emptyState('Розділ порожній', 'Додайте першу позицію до каталогу.'); return; }
  list.innerHTML = items.map(item => {
    const images = [...new Set([...(Array.isArray(item.images) ? item.images : []), item.image].filter(Boolean))];
    const image = images[0] ? `<button class="equipment-admin-media" type="button" data-preview="${escapeHtml(images[0])}" aria-label="Збільшити фото"><img src="${escapeHtml(images[0])}" alt="${escapeHtml(`${item.brand || ''} ${item.model || item.name || ''}`)}" loading="lazy"><span>${images.length} фото</span></button>` : '<div class="equipment-admin-media is-empty"><span>Фото не додано</span></div>';
    const retail = [item.price, item.priceUsd ? `$${Number(item.priceUsd).toLocaleString('en-US')}` : ''].filter(Boolean).join(' · ') || 'не вказано';
    const purchase = item.purchasePrice ? `${Number(item.purchasePrice).toLocaleString('en-US')} ${item.purchaseCurrency || 'USD'}` : item.listPrice ? `${Number(item.listPrice).toLocaleString('uk-UA')} грн (прайс)` : 'не вказано';
    return `<article data-id="${escapeHtml(String(item._id))}">${image}<span class="equipment-admin-brand">${escapeHtml(item.brand || 'ETI')}</span><h3>${escapeHtml(item.model || item.name || 'Позиція')}</h3><p>${escapeHtml(item.power || item.spec || '—')} · ${escapeHtml(item.phase || item.category || '—')}</p><p class="equipment-admin-pricing"><b>Роздріб:</b> ${escapeHtml(retail)}<br><b>Закупівля / прайс:</b> ${escapeHtml(purchase)}</p><div>${statusBadge(item.status || 'active')}<button class="edit-catalog-item" type="button">Налаштувати</button><button class="delete-catalog-item danger-link" type="button">Видалити</button></div></article>`;
  }).join('');
  $$('.equipment-admin-media[data-preview]', list).forEach(button => button.addEventListener('click', () => { const image = $('#admin-image-preview'); image.src = button.dataset.preview; imageDialog.showModal(); }));
  $$('.edit-catalog-item', list).forEach(button => button.addEventListener('click', () => openContentDialog(type, items.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.delete-catalog-item', list).forEach(button => button.addEventListener('click', () => removeItem(type, button.closest('article').dataset.id)));
}
const renderSolarPanels = () => renderCatalogAdmin('solarPanels', '#solar-panels-list');
const renderGreenProtect = () => renderCatalogAdmin('greenProtect', '#green-protect-list');

const imageDialog = $('#admin-image-dialog');
const imagePreview = $('#admin-image-preview');
const imageCounter = $('#admin-image-counter');
const imageTitle = $('#admin-image-title');
let imageViewerItems = [];
let imageViewerIndex = 0;

function updateEquipmentImageViewer() {
  if (!imageViewerItems.length || !imagePreview) return;
  imagePreview.src = imageViewerItems[imageViewerIndex];
  imageCounter.textContent = `${imageViewerIndex + 1} / ${imageViewerItems.length}`;
  const hasMultiple = imageViewerItems.length > 1;
  $('.admin-image-prev', imageDialog).disabled = !hasMultiple;
  $('.admin-image-next', imageDialog).disabled = !hasMultiple;
  imageDialog.classList.remove('is-zoomed');
  $('.admin-image-zoom', imageDialog).setAttribute('aria-pressed', 'false');
  $('.admin-image-zoom', imageDialog).textContent = 'Збільшити';
}

function openEquipmentImageViewer(item) {
  imageViewerItems = [...new Set([...(Array.isArray(item.images) ? item.images : []), item.image].filter(Boolean))];
  if (!imageViewerItems.length || !imageDialog) return;
  imageViewerIndex = 0;
  imageTitle.textContent = `${item.brand || ''} ${item.model || ''}`.trim() || 'Обладнання';
  imagePreview.alt = `Фото ${imageTitle.textContent}`;
  updateEquipmentImageViewer();
  imageDialog.showModal();
}

function moveEquipmentImage(direction) {
  if (imageViewerItems.length < 2) return;
  imageViewerIndex = (imageViewerIndex + direction + imageViewerItems.length) % imageViewerItems.length;
  updateEquipmentImageViewer();
}

function toggleEquipmentImageZoom() {
  if (!imageDialog) return;
  const isZoomed = imageDialog.classList.toggle('is-zoomed');
  const button = $('.admin-image-zoom', imageDialog);
  button.setAttribute('aria-pressed', String(isZoomed));
  button.textContent = isZoomed ? 'Зменшити' : 'Збільшити';
}

function quotePdfDocument(quote = {}) {
  const currency = quote.currency || 'UAH';
  const subtotal = Number(quote.subtotal || (quote.items || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0));
  const rows = (quote.items || []).map((item, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(item.name || '')}</strong>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}</td><td>${escapeHtml(item.quantity || 1)} ${escapeHtml(item.unit || 'шт.')}</td><td>${escapeHtml(formatMoney(item.unitPrice, currency))}</td><td><strong>${escapeHtml(formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0), currency))}</strong></td></tr>`).join('');
  const status = quote.status && quote.status !== 'draft' ? (statusLabels[quote.status]?.[0] || quote.status) : '';
  const validity = quoteValidityLabel(quote);
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>${escapeHtml(quote.number || 'Комерційна пропозиція')}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#10201a;font:13px/1.45 Arial,sans-serif}header{display:flex;justify-content:space-between;gap:24px;padding:22px;border-radius:18px;background:#0c211a;color:#f8f8ef}header b{display:block;color:#d8ef69;font-size:11px;letter-spacing:.12em}header h1{margin:8px 0 4px;font-size:29px}header p{margin:0;color:#b9c8c1}.meta{min-width:210px;text-align:right}.validity{margin:18px 0;padding:13px 16px;border:1px solid #d8ef69;border-radius:12px;background:#f7f9e8}.client{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:22px 0;padding:16px;border:1px solid #dce1dc;border-radius:14px}.client p{margin:3px 0}table{width:100%;border-collapse:collapse}th{padding:10px 8px;border-bottom:2px solid #10201a;text-align:left;font-size:10px;text-transform:uppercase}td{padding:11px 8px;border-bottom:1px solid #dce1dc;vertical-align:top}td:first-child{width:28px;color:#74817b}td:nth-child(3),td:nth-child(4),td:nth-child(5){white-space:nowrap;text-align:right}td small{display:block;margin-top:3px;color:#74817b}.total{display:flex;justify-content:flex-end;gap:25px;margin-top:18px;padding:16px;border-radius:12px;background:#f0f2ed;font-size:18px}.note{margin-top:18px;padding:15px;border-left:4px solid #d8ef69;background:#f7f8f4}.footer{margin-top:28px;padding-top:12px;border-top:1px solid #dce1dc;color:#74817b;font-size:11px}@media print{.no-print{display:none}}</style></head><body><header><div><b>VOLTARES / І.Н.К. ТОВ</b><h1>Комерційна пропозиція</h1><p>${escapeHtml(quote.number || '')}</p></div><div class="meta">${status ? `<p>${escapeHtml(status)}</p>` : ''}<p>${escapeHtml(formatDate(quote.createdAt))}</p></div></header>${validity ? `<div class="validity"><strong>Строк дії та резерв</strong><br>${escapeHtml(validity)}</div>` : ''}<section class="client"><div><strong>Клієнт</strong><p>${escapeHtml(quote.customerName || 'Не вказано')}</p>${quote.company ? `<p>${escapeHtml(quote.company)}</p>` : ''}</div><div><strong>Контакти</strong>${quote.phone ? `<p>${escapeHtml(quote.phone)}</p>` : ''}${quote.email ? `<p>${escapeHtml(quote.email)}</p>` : ''}${quote.city ? `<p>${escapeHtml(quote.city)}</p>` : ''}</div></section><table><thead><tr><th>№</th><th>Позиція</th><th>Кількість</th><th>Ціна</th><th>Сума</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Позиції ще не додані</td></tr>'}</tbody></table><div class="total"><span>Разом</span><strong>${escapeHtml(formatMoney(subtotal, currency))}</strong></div>${quote.note ? `<div class="note"><strong>Примітка</strong><p>${escapeHtml(quote.note)}</p></div>` : ''}<div class="footer">Voltares · І.Н.К. ТОВ · +38 067 672 18 52 · ink.torg@gmail.com</div></body></html>`;
}

function saveQuoteAsPdf(quote) {
  openPrintDocument(quotePdfDocument(quote), 'Браузер заблокував вікно PDF. Дозвольте спливні вікна для CRM.');
}

function previewQuote(quote) {
  const publicUrl = quotePublicUrl(quote);
  if (publicUrl) return window.open(publicUrl, '_blank', 'noopener');
  openPreviewDocument(quotePdfDocument(quote));
}

function quoteIsOwner(quote = null) {
  if (!quote) return true;
  if (quote.ownerId) return String(quote.ownerId) === String(currentAdmin?.id || '');
  if (quote.createdBy) return String(quote.createdBy).toLowerCase() === String(currentAdmin?.name || '').toLowerCase();
  return currentAdmin?.role === 'admin';
}

function quoteAccessUsers(quote = {}) {
  const shared = new Set((quote.sharedWith || []).map(String));
  return state.users.filter(user => shared.has(String(user._id)));
}

function quoteAccessSummary(quote = {}) {
  const names = quoteAccessUsers(quote).map(user => user.username).filter(Boolean);
  return names.length ? `Спільний доступ: ${names.join(', ')}` : 'Доступ: лише автор';
}

function renderQuoteAccess(quote = null) {
  const owner = quote?.createdBy || currentAdmin?.name || '—';
  const isOwner = quoteIsOwner(quote);
  const selected = new Set((quote?.sharedWith || []).map(String));
  const legacyOwner = state.users.find(user => String(user.username || '').toLowerCase() === String(owner).toLowerCase());
  const ownerId = quote?.ownerId || legacyOwner?._id || currentAdmin?.id || '';
  const candidates = state.users.filter(user => user.status === 'active' && String(user._id) !== String(ownerId));
  const ownerOutput = $('#quote-owner');
  const help = $('#quote-access-help');
  const list = $('#quote-access-list');
  if (ownerOutput) ownerOutput.textContent = `Власник: ${owner}`;
  if (help) help.textContent = isOwner ? 'Позначте співробітників, яким можна переглядати, редагувати, друкувати та надсилати це КП.' : 'Список доступу може змінювати лише власник КП.';
  if (!list) return;
  list.className = 'quote-access-list';
  if (!candidates.length) {
    list.innerHTML = '<p class="quote-access-empty">Інших активних співробітників немає.</p>';
    updateQuoteAccessLabel();
    return;
  }
  list.innerHTML = candidates.map(user => `<label class="quote-access-person${isOwner ? '' : ' is-disabled'}"><input type="checkbox" data-quote-access-id="${escapeHtml(String(user._id))}" ${selected.has(String(user._id)) ? 'checked' : ''} ${isOwner ? '' : 'disabled'}><i aria-hidden="true"></i><span>${escapeHtml(user.username || 'Співробітник')}</span></label>`).join('');
  updateQuoteAccessLabel();
}

function selectedQuoteAccess() {
  return $$('[data-quote-access-id]:checked', $('#quote-access-list')).map(input => input.dataset.quoteAccessId).filter(Boolean);
}

function updateQuoteAccessLabel() {
  const output = $('#quote-access-summary-label');
  if (!output) return;
  const checked = $$('[data-quote-access-id]:checked', $('#quote-access-list'));
  const noun = checked.length >= 2 && checked.length <= 4 ? 'співробітники' : 'співробітників';
  output.textContent = checked.length === 0 ? 'Лише автор' : checked.length === 1 ? checked[0].closest('label')?.querySelector('span')?.textContent || '1 співробітник' : `${checked.length} ${noun}`;
}

$('#quote-access-list')?.addEventListener('change', updateQuoteAccessLabel);
document.addEventListener('pointerdown', event => {
  const dropdown = $('.quote-access-dropdown');
  if (dropdown?.open && !dropdown.contains(event.target)) dropdown.open = false;
  $$('.quote-more[open], .quote-action-menu[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener('click', event => {
  const action = event.target.closest('.quote-more button, .quote-action-menu button');
  if (action) action.closest('details').open = false;
});

let quoteFilter = 'all';
const quoteStatusLabels = { draft:'Чернетка', sent:'Надіслано', viewed:'Переглянуто', confirmed:'Підтверджено', cancelled:'Скасовано', accepted:'Підтверджено', completed:'Підтверджено', declined:'Скасовано' };
function normalizedQuoteStatus(status = 'draft') { return ({ accepted:'confirmed', completed:'confirmed', declined:'cancelled' }[status] || status); }
function quoteHasUnreadActivity(quote = {}) { return Boolean(quote.lastClientActivityAt && (!quote.adminViewedActivityAt || new Date(quote.lastClientActivityAt) > new Date(quote.adminViewedActivityAt))); }
function quotePublicUrl(quote = {}) { return quote.publicEnabled && quote.publicToken ? `https://www.voltares.pp.ua/proposal/${quote.publicToken}` : ''; }
async function copyText(value) {
  if (!value) throw new Error('LINK_NOT_AVAILABLE');
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea'); input.value = value; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select(); document.execCommand('copy'); input.remove();
}
function showQuoteShare(url, emailDelivered = null) {
  const dialog = $('#quote-share-dialog'); $('#quote-share-url').value = url;
  $('#quote-share-email-status').textContent = emailDelivered === false ? 'Публічне посилання створено. Email не доставлено — скопіюйте посилання та надішліть його клієнту вручну.' : emailDelivered === true ? 'Email із посиланням успішно надіслано клієнту.' : '';
  const message = `Комерційна пропозиція Voltares\n${url}`;
  $('#quote-share-whatsapp').href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  $('#quote-share-telegram').href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Комерційна пропозиція Voltares')}`;
  $('#quote-share-viber').href = `viber://forward?text=${encodeURIComponent(message)}`;
  $('#quote-share-system').hidden = typeof navigator.share !== 'function';
  $('#quote-share-menu').hidden = true; $('#quote-share-native').setAttribute('aria-expanded', 'false'); dialog.showModal();
}
async function runQuoteAction(action, quote, trigger) {
  if (!quote) return;
  try {
    if (action === 'edit') return openQuoteDialog(quote);
    if (action === 'pdf') return saveQuoteAsPdf(quote);
    if (action === 'preview') return previewQuote(quote);
    if (action === 'share') { const url = quotePublicUrl(quote); if (!url) throw new Error('Спочатку створіть публічне посилання.'); showQuoteShare(url); return; }
    if (action === 'access') return openQuoteDialog(quote, true);
    if (action === 'delete') return removeItem('quotes', quote._id);
    if (action === 'copy') { await copyText(quotePublicUrl(quote)); showApiNotice('Публічне посилання скопійовано.'); return; }
    if (action === 'open') return window.open(quotePublicUrl(quote), '_blank', 'noopener');
    setBusy(trigger, true);
    if (action === 'publish') {
      const result = await api(`/api/admin/proposals/${quote._id}/publish`, { method:'POST', body:'{}' });
      await loadCollection('quotes'); renderQuotes(); showQuoteShare(result.publicUrl);
    } else if (action === 'revoke') {
      if (!confirm('Відкликати публічне посилання? Клієнт більше не зможе відкрити пропозицію.')) return;
      await api(`/api/admin/proposals/${quote._id}/revoke`, { method:'POST', body:'{}' }); await loadCollection('quotes'); renderQuotes();
    } else if (action === 'version') {
      const created = await api(`/api/admin/proposals/${quote._id}/create-version`, { method:'POST', body:'{}' }); await loadCollection('quotes'); renderQuotes(); openQuoteDialog(created);
    } else if (action === 'send') {
      const result = await api(`/api/quotes/${quote._id}/send`, { method:'POST', body:'{}' }); await loadCollection('quotes'); renderQuotes(); showQuoteShare(result.publicUrl, result.emailDelivered);
    }
  } catch (error) { showApiNotice(`Не вдалося виконати дію: ${error.message}`); }
  finally { if (trigger?.isConnected) setBusy(trigger, false); }
}

function renderQuotes() {
  const list = $('#quote-list');
  if (!list) return;
  const quotes = state.quotes.filter(quote => quoteFilter === 'all' || quoteFilter === 'attention' ? quoteFilter !== 'attention' || quoteHasUnreadActivity(quote) : normalizedQuoteStatus(quote.status) === quoteFilter);
  if (!quotes.length) { list.innerHTML = emptyState(state.quotes.length ? 'За цим фільтром пропозицій немає' : 'Пропозицій ще немає', state.quotes.length ? 'Оберіть інший статус.' : 'Створіть першу пропозицію з товарів каталогу або власних позицій.'); return; }
  list.innerHTML = quotes.map(quote => {
    const owner = quote.createdBy || '—';
    const canManageAccess = quoteIsOwner(quote);
    const status = normalizedQuoteStatus(quote.status); const unread = quoteHasUnreadActivity(quote);
    const activity = unread ? `<div class="quote-client-activity">Нове: клієнт ${status === 'confirmed' ? 'підтвердив' : 'переглянув'} пропозицію · ${escapeHtml(formatDate(quote.lastClientActivityAt))}</div>` : '';
    const version = Number(quote.version || 1) > 1 ? `<small class="quote-version-info">Версія ${escapeHtml(quote.version)}${quote.previousVersionId ? ' · створено на основі попереднього КП' : ''}</small>` : '';
    return `<article data-id="${escapeHtml(String(quote._id))}" class="${unread ? 'has-unread-activity' : ''}"><header><div><span class="view-caption">${escapeHtml(quote.number || 'КП')}</span><h3>${escapeHtml(quote.customerName || quote.company || 'Клієнт')}</h3><p>${escapeHtml([quote.company, quote.phone, quote.email].filter(Boolean).join(' · '))}</p><div class="quote-card-meta"><span>Створено ${escapeHtml(formatDate(quote.createdAt))}</span><span>Діє до ${escapeHtml(quote.validUntil ? formatDate(`${quote.validUntil}T12:00:00`) : '—')}</span>${quote.lastViewedAt ? `<span>Останній перегляд ${escapeHtml(formatDate(quote.lastViewedAt))}</span>` : ''}${quote.confirmedAt ? `<span>Підтверджено ${escapeHtml(formatDate(quote.confirmedAt))}</span>` : ''}</div><small class="quote-access-summary">Власник: ${escapeHtml(owner)} · ${escapeHtml(quoteAccessSummary(quote))}</small>${version}${activity}</div><span class="quote-status-badge status-${escapeHtml(status)}">${escapeHtml(quoteStatusLabels[status] || status)}</span></header><ul>${(quote.items || []).slice(0, 5).map(item => `<li><span>${escapeHtml(item.name)}</span><b>${escapeHtml(item.quantity)} ${escapeHtml(item.unit || 'шт.')} · ${escapeHtml(formatMoney(item.total ?? Number(item.quantity) * Number(item.unitPrice), quote.currency))}</b></li>`).join('')}${(quote.items || []).length > 5 ? `<li><span>Ще ${(quote.items || []).length - 5} позицій</span></li>` : ''}</ul><footer><strong>${escapeHtml(formatMoney(quote.subtotal, quote.currency))}</strong><small class="email-delivery ${quote.emailStatus === 'sent' ? 'is-sent' : ''}">${quote.emailStatus === 'sent' ? `Email надіслано ${formatDate(quote.sentAt)}` : quote.emailStatus === 'failed' ? 'Email не доставлено' : 'Email ще не надсилався'}</small><div><button class="secondary-admin" data-quote-action="edit" type="button">${status === 'confirmed' ? 'Відкрити' : 'Редагувати'}</button>${!['confirmed','cancelled'].includes(status) ? `<button class="primary-admin" data-quote-action="send" type="button">Зберегти й надіслати</button>` : ''}<details class="quote-action-menu"><summary aria-label="Додаткові дії">⋯</summary><div><button data-quote-action="pdf">Друк / PDF</button><button data-quote-action="preview">Попередній перегляд</button>${quote.publicEnabled ? '<button data-quote-action="copy">Скопіювати посилання</button><button data-quote-action="open">Відкрити публічне посилання</button><button data-quote-action="revoke">Відкликати посилання</button>' : status !== 'draft' ? '<button data-quote-action="publish">Створити публічне посилання</button>' : ''}${status === 'confirmed' ? '<button data-quote-action="version">Створити нову версію</button>' : ''}${canManageAccess ? '<button data-quote-action="access">Доступ</button><button class="danger-admin" data-quote-action="delete">Видалити</button>' : ''}</div></details></div></footer></article>`;
  }).join('');
  $$('article[data-id]', list).forEach(article => {
    const quote = state.quotes.find(item => String(item._id) === article.dataset.id);
    if (normalizedQuoteStatus(quote?.status) === 'cancelled') $('[data-quote-action="publish"]', article)?.remove();
    if (normalizedQuoteStatus(quote?.status) === 'confirmed') $('[data-quote-action="delete"]', article)?.remove();
  });
  $$('[data-quote-action]', list).forEach(button => button.addEventListener('click', () => runQuoteAction(button.dataset.quoteAction, state.quotes.find(item => String(item._id) === button.closest('article').dataset.id), button)));
}

$('#quote-filters')?.addEventListener('click', event => { const button = event.target.closest('[data-quote-filter]'); if (!button) return; quoteFilter = button.dataset.quoteFilter; $$('#quote-filters button').forEach(item => item.classList.toggle('is-active', item === button)); renderQuotes(); });

function renderPurchases() {
  const list = $('#purchase-list');
  if (!list) return;
  if (!state.purchases.length) { list.innerHTML = emptyState('Закупівель ще немає', 'Додайте рахунок, чек, інвойс або звичайний список закупівлі.'); return; }
  list.innerHTML = state.purchases.map(item => `<article data-id="${escapeHtml(String(item._id))}"><header><div><span class="view-caption">${escapeHtml(item.date || formatDate(item.createdAt))}</span><h3>${escapeHtml(item.supplier || 'Постачальник')}</h3><p>${item.customer ? `Під замовлення: <b>${escapeHtml(item.customer)}</b>` : 'Закупівля на склад'}</p></div>${statusBadge(item.status || 'planned')}</header><div class="purchase-copy"><strong>${escapeHtml(formatMoney(item.amount, item.currency))}</strong>${item.list ? `<p>${escapeHtml(item.list)}</p>` : ''}${item.comment ? `<small>${escapeHtml(item.comment)}</small>` : ''}</div><div class="purchase-files">${(item.attachments || []).map(file => `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener">▧ ${escapeHtml(file.name || 'Документ')}</a>`).join('') || '<span>Вкладень немає</span>'}</div><footer><small>Створив: ${escapeHtml(item.createdBy || '—')}</small><div><button class="secondary-admin purchase-edit" type="button">Редагувати</button><button class="secondary-admin danger-admin purchase-delete" type="button">Видалити</button></div></footer></article>`).join('');
  $$('.purchase-edit', list).forEach(button => button.addEventListener('click', () => openContentDialog('purchases', state.purchases.find(item => String(item._id) === button.closest('article').dataset.id))));
  $$('.purchase-delete', list).forEach(button => button.addEventListener('click', () => removeItem('purchases', button.closest('article').dataset.id)));
}

const quoteDialog = $('#quote-dialog');
const quoteForm = $('#quote-form');
const quoteField = name => quoteForm?.elements?.namedItem(name);
let activeQuote = null;
let quoteDraftItems = [];
let quoteCurrency = 'UAH';
let quoteDragIndex = -1;
let quoteSourceLeadId = '';

const quoteOpenPublicButton = $('[data-quote-menu="open"]');
if (quoteOpenPublicButton && !$('[data-quote-menu="share"]')) quoteOpenPublicButton.insertAdjacentHTML('afterend', '<button type="button" data-quote-menu="share">Надіслати через…</button>');

function updateQuoteEditorActions(item = activeQuote) {
  const status = normalizedQuoteStatus(item?.status || 'draft'); const readonly = status === 'confirmed'; const hasLink = Boolean(item?.publicEnabled && item?.publicToken);
  quoteDialog.classList.toggle('is-readonly', readonly); $('.quote-readonly-notice').hidden = !readonly;
  $$('input, textarea, select', quoteForm).forEach(field => { field.disabled = readonly; });
  quoteField('status').disabled = readonly || !item;
  Array.from(quoteField('status').options).forEach(option => { option.disabled = ![status,'cancelled'].includes(option.value); });
  $$('[data-quote-menu]', quoteForm).forEach(button => {
    const action = button.dataset.quoteMenu;
    button.hidden = action === 'publish' ? !item || hasLink || readonly || status === 'cancelled' : action === 'copy' || action === 'open' || action === 'share' || action === 'revoke' ? !hasLink : action === 'version' ? !readonly : false;
  });
}

function catalogueForQuote() {
  return [
    ...state.equipment.map(item => ({ ...item, _collection:'equipment' })),
    ...state.solarPanels.map(item => ({ ...item, _collection:'solarPanels' })),
    ...state.greenProtect.map(item => ({ ...item, _collection:'greenProtect' }))
  ].filter(item => item.status === 'active');
}

function priceNumber(value = '') { const digits = String(value).replace(/[^\d.,]/g, '').replaceAll(' ', '').replace(',', '.'); const number = Number(digits); return Number.isFinite(number) ? number : 0; }

function quoteExchangeRate() {
  const rates = catalogueForQuote().map(item => {
    const uah = priceNumber(item.price);
    const usd = Number(item.priceUsd || 0);
    return uah > 0 && usd > 0 ? uah / usd : 0;
  }).filter(rate => rate >= 20 && rate <= 100).sort((left, right) => left - right);
  if (!rates.length) return 44;
  const middle = Math.floor(rates.length / 2);
  return rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
}

function quotePriceInCurrency(product, currency, fallback = 0, previousCurrency = quoteCurrency) {
  const direct = currency === 'USD' ? Number(product?.priceUsd || 0) : priceNumber(product?.price);
  if (direct > 0) return direct;
  const rate = quoteExchangeRate();
  const converted = previousCurrency === currency ? Number(fallback || 0) : currency === 'USD' ? Number(fallback || 0) / rate : Number(fallback || 0) * rate;
  return currency === 'UAH' ? Math.round(converted) : Math.round(converted * 100) / 100;
}

function convertQuoteCurrency(nextCurrency) {
  if (!['UAH', 'USD'].includes(nextCurrency) || nextCurrency === quoteCurrency) return updateQuoteTotal();
  const products = catalogueForQuote();
  quoteDraftItems = quoteDraftItems.map(line => {
    const product = line.kind === 'catalog' ? products.find(item => item._collection === line.collection && String(item._id) === String(line.productId)) : null;
    return { ...line, unitPrice:quotePriceInCurrency(product, nextCurrency, line.unitPrice, quoteCurrency) };
  });
  quoteCurrency = nextCurrency;
  renderQuoteDraftItems();
}

function quoteProductOptions() {
  const select = $('#quote-product-select');
  if (!select) return;
  select.innerHTML = '<option value="">Оберіть товар</option>' + catalogueForQuote().map(item => `<option value="${escapeHtml(`${item._collection}:${item._id}`)}">${escapeHtml(`${item.brand || ''} ${item.model || item.name || ''}`.trim())} · ${escapeHtml(item.price || 'за запитом')}</option>`).join('');
}

function localDateAfter(days = 0, base = new Date()) {
  const date = new Date(base || Date.now());
  date.setDate(date.getDate() + Number(days || 0));
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatCalendarDate(value = '') {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : String(value || '');
}

function daysFromDates(from, until) {
  const start = new Date(from || Date.now());
  const end = new Date(`${until || ''}T12:00:00`);
  if (Number.isNaN(end.getTime())) return 3;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function quoteValidityLabel(quote = {}) {
  const days = Math.max(1, daysFromDates(quote.createdAt || new Date(), quote.validUntil));
  const until = quote.validUntil || localDateAfter(days, quote.createdAt || new Date());
  const mod10 = days % 10; const mod100 = days % 100;
  const noun = mod10 === 1 && mod100 !== 11 ? 'календарний день' : [2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100) ? 'календарні дні' : 'календарних днів';
  return `Ціна та наявність зарезервовані на ${days} ${noun}, до ${formatCalendarDate(until)} включно.`;
}

function renderQuoteDraftItems() {
  const list = $('#quote-items');
  if (!list) return;
  list.innerHTML = quoteDraftItems.length ? quoteDraftItems.map((item, index) => `<article data-index="${index}" class="${item.kind === 'custom' ? 'is-custom' : ''}"><div class="quote-line-order"><button class="quote-drag-handle" type="button" draggable="true" aria-label="Перетягнути позицію ${index + 1}" title="Перетягніть, щоб змінити порядок">↕</button><span class="quote-line-number">${String(index + 1).padStart(2, '0')}</span><button class="quote-line-move" type="button" data-direction="-1" aria-label="Перемістити позицію вище" title="Перемістити вище" ${index === 0 ? 'disabled' : ''}>↑</button><button class="quote-line-move" type="button" data-direction="1" aria-label="Перемістити позицію нижче" title="Перемістити нижче" ${index === quoteDraftItems.length - 1 ? 'disabled' : ''}>↓</button></div><div class="quote-line-fields"><label>Назва<input data-field="name" value="${escapeHtml(item.name || '')}" placeholder="Товар або робота"></label><label>Опис<input data-field="description" value="${escapeHtml(item.description || '')}" placeholder="Необов’язкове уточнення"></label></div><label>Кількість<input data-field="quantity" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(Math.max(1, Math.round(Number(item.quantity) || 1)))}"></label><label>Од.<input data-field="unit" value="${escapeHtml(item.unit || 'шт.')}" maxlength="20"></label><label>Ціна за од.<input data-field="unitPrice" type="number" min="0" step="0.01" value="${escapeHtml(item.unitPrice || 0)}"></label><strong data-line-total>${escapeHtml(formatMoney(Math.max(1, Math.round(Number(item.quantity) || 1)) * Number(item.unitPrice || 0), quoteField('currency')?.value || 'UAH'))}</strong><button class="quote-line-remove" type="button" aria-label="Видалити позицію">×</button></article>`).join('') : '<div class="empty-state"><strong>Чернетка поки порожня</strong>Її вже можна зберегти або додати товар із каталогу чи довільний рядок.</div>';
  updateQuoteTotal();
}

function updateQuoteTotal() {
  const currency = quoteField('currency')?.value || 'UAH';
  const total = quoteDraftItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const output = $('#quote-total'); if (output) output.textContent = formatMoney(total, currency);
  $$('#quote-items article').forEach((row, index) => { const line = $('[data-line-total]', row); if (line) line.textContent = formatMoney(Number(quoteDraftItems[index]?.quantity || 0) * Number(quoteDraftItems[index]?.unitPrice || 0), currency); });
}

function openQuoteDialog(item = null, focusAccess = false) {
  activeQuote = item;
  quoteSourceLeadId = String(item?.sourceLeadId || '');
  quoteDraftItems = (item?.items || []).map(line => ({ ...line, quantity:Math.max(1, Math.round(Number(line.quantity) || 1)) }));
  quoteForm.reset();
  quoteField('customerName').value = item?.customerName || '';
  quoteField('company').value = item?.company || '';
  quoteField('email').value = item?.email || '';
  quoteField('phone').value = item?.phone || '';
  quoteField('city').value = item?.city || '';
  quoteField('validUntil').value = item?.validUntil || localDateAfter(3);
  quoteField('currency').value = item?.currency || 'UAH';
  quoteCurrency = quoteField('currency').value;
  quoteField('status').value = normalizedQuoteStatus(item?.status || 'draft');
  quoteField('note').value = item?.note || '';
  $('#quote-dialog-title').textContent = item ? `Редагувати ${item.number || 'пропозицію'}` : 'Нова комерційна пропозиція';
  $('.quote-form-status').textContent = '';
  quoteProductOptions(); renderQuoteDraftItems(); renderQuoteAccess(item); updateQuoteEditorActions(item); quoteDialog.showModal();
  if (item && quoteHasUnreadActivity(item)) {
    item.adminViewedActivityAt = new Date().toISOString();
    api(`/api/admin/proposals/${item._id}/mark-activity-seen`, { method:'POST', body:'{}' }).then(() => renderQuotes()).catch(() => {});
  }
  if (focusAccess) requestAnimationFrame(() => {
    const dropdown = $('.quote-access-dropdown');
    if (dropdown) { dropdown.open = true; dropdown.scrollIntoView({ block:'center', behavior:'smooth' }); }
  });
}

function openQuoteFromLead(lead = {}) {
  openQuoteDialog();
  quoteSourceLeadId = String(lead._id || '');
  quoteField('customerName').value = lead.name || '';
  quoteField('email').value = lead.email || '';
  quoteField('phone').value = lead.phone || '';
  quoteField('city').value = lead.city || '';
  quoteDraftItems = (Array.isArray(lead.items) ? lead.items : []).map(item => ({
    kind:'catalog',
    collection:item.collection || 'equipment',
    productId:String(item.id || ''), productSlug:String(item.id || ''), productUrl:item.id ? `/products/${item.id}` : '',
    name:item.name || 'Товар',
    description:[item.power, item.phase, item.voltage].filter(Boolean).join(' · '),
    quantity:Math.max(1, Math.round(Number(item.quantity) || 1)),
    unit:'шт.',
    unitPrice:priceNumber(item.price)
  }));
  const reference = String(lead._id || '').slice(0, 8);
  quoteField('note').value = [
    `Створено із заявки #${reference}`,
    lead.object ? `Тип об’єкта: ${lead.object}` : '',
    lead.need ? `Потреба: ${lead.need}` : '',
    lead.comment || ''
  ].filter(Boolean).join('\n');
  $('#quote-dialog-title').textContent = `Нове КП із заявки #${reference}`;
  renderQuoteDraftItems();
}

function addQuoteCatalogueItem() {
  const value = $('#quote-product-select').value; if (!value) return;
  const [collection, id] = value.split(':');
  const item = catalogueForQuote().find(product => product._collection === collection && String(product._id) === id); if (!item) return;
  const currency = quoteField('currency').value;
  const description = [item.power || item.spec, item.phase || item.technology || item.category, item.voltage].filter(Boolean).join(' · ');
  const image = item.thumbnail || (Array.isArray(item.images) ? item.images[0] : '') || item.image || '';
  quoteDraftItems.push({ kind:'catalog', collection, productId:String(item._id), productSlug:String(item._id), productUrl:`/products/${item._id}`, image, name:`${item.brand || ''} ${item.model || item.name || ''}`.trim(), description, shortDescription:description, quantity:1, unit:'шт.', unitPrice:quotePriceInCurrency(item, currency, 0, currency), discount:0, currency });
  renderQuoteDraftItems();
}

function addQuoteCustomItem() {
  quoteDraftItems.push({ kind:'custom', name:'', description:'', quantity:1, unit:'посл.', unitPrice:0 });
  renderQuoteDraftItems();
  const last = $('#quote-items article:last-of-type input[data-field="name"]'); last?.focus();
}

$('#quote-items')?.addEventListener('input', event => {
  const input = event.target.closest('[data-field]'); if (!input) return;
  const index = Number(input.closest('article').dataset.index); if (!quoteDraftItems[index]) return;
  if (input.dataset.field === 'quantity') {
    const quantity = Math.max(1, Math.round(Number(input.value) || 1));
    input.value = String(quantity);
    quoteDraftItems[index].quantity = quantity;
  } else {
    quoteDraftItems[index][input.dataset.field] = input.dataset.field === 'unitPrice' ? Number(input.value || 0) : input.value;
    if (input.dataset.field === 'description') quoteDraftItems[index].shortDescription = input.value;
  }
  updateQuoteTotal();
});
function moveQuoteItem(from, to) {
  if (from === to || from < 0 || to < 0 || from >= quoteDraftItems.length || to >= quoteDraftItems.length) return;
  const [item] = quoteDraftItems.splice(from, 1);
  quoteDraftItems.splice(to, 0, item);
  renderQuoteDraftItems();
}
$('#quote-items')?.addEventListener('click', event => {
  const row = event.target.closest('article'); if (!row) return;
  const index = Number(row.dataset.index);
  const remove = event.target.closest('.quote-line-remove');
  if (remove) { quoteDraftItems.splice(index, 1); renderQuoteDraftItems(); return; }
  const move = event.target.closest('.quote-line-move');
  if (move) moveQuoteItem(index, index + Number(move.dataset.direction || 0));
});
$('#quote-items')?.addEventListener('dragstart', event => {
  const handle = event.target.closest('.quote-drag-handle'); if (!handle) return event.preventDefault();
  const row = handle.closest('article'); quoteDragIndex = Number(row.dataset.index);
  row.classList.add('is-dragging');
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(quoteDragIndex)); }
});
$('#quote-items')?.addEventListener('dragover', event => { if (quoteDragIndex >= 0 && event.target.closest('article')) event.preventDefault(); });
$('#quote-items')?.addEventListener('drop', event => {
  const row = event.target.closest('article'); if (!row || quoteDragIndex < 0) return;
  event.preventDefault(); const targetIndex = Number(row.dataset.index); const sourceIndex = quoteDragIndex; quoteDragIndex = -1; moveQuoteItem(sourceIndex, targetIndex);
});
$('#quote-items')?.addEventListener('dragend', () => { quoteDragIndex = -1; $$('#quote-items article').forEach(row => row.classList.remove('is-dragging')); });
$('#quote-add-product')?.addEventListener('click', addQuoteCatalogueItem);
$('#quote-add-custom')?.addEventListener('click', addQuoteCustomItem);
quoteField('currency')?.addEventListener('change', event => convertQuoteCurrency(event.currentTarget.value));
$('.quote-dialog-close')?.addEventListener('click', () => quoteDialog.close());
$('.quote-dialog-cancel')?.addEventListener('click', () => quoteDialog.close());
$('.quote-dialog-print')?.addEventListener('click', () => {
  const fields = Object.fromEntries(new FormData(quoteForm).entries());
  const subtotal = quoteDraftItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  saveQuoteAsPdf({ ...activeQuote, ...fields, items:quoteDraftItems.map(item => ({ ...item })), subtotal, createdAt:activeQuote?.createdAt || new Date().toISOString(), number:activeQuote?.number || 'Нове КП' });
});
$('[data-quote-menu="preview"]')?.addEventListener('click', () => {
  const fields = Object.fromEntries(new FormData(quoteForm).entries());
  const subtotal = quoteDraftItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  previewQuote({ ...activeQuote, ...fields, items:quoteDraftItems.map(item => ({ ...item })), subtotal, createdAt:activeQuote?.createdAt || new Date().toISOString(), number:activeQuote?.number || 'Нове КП' });
});
$$('[data-quote-menu]').forEach(button => button.addEventListener('click', async () => {
  const action = button.dataset.quoteMenu; if (action === 'preview') return;
  if (!activeQuote) return showApiNotice('Спочатку збережіть чернетку.');
  if (action === 'copy') { try { await copyText(quotePublicUrl(activeQuote)); showApiNotice('Публічне посилання скопійовано.'); } catch (error) { showApiNotice(error.message); } return; }
  if (action === 'open') return window.open(quotePublicUrl(activeQuote), '_blank', 'noopener');
  quoteDialog.close(); await runQuoteAction(action, activeQuote, button);
}));
quoteDialog?.addEventListener('cancel', event => event.preventDefault());
quoteForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const action = event.submitter?.dataset.quoteAction || 'save'; const button = event.submitter;
  const fields = Object.fromEntries(new FormData(quoteForm).entries());
  const namedItems = quoteDraftItems.filter(item => String(item.name || '').trim());
  if (action === 'send') {
    if (!String(fields.customerName || '').trim()) { $('.quote-form-status').textContent = 'Для надсилання вкажіть ім’я клієнта.'; quoteField('customerName').focus(); return; }
    if (String(fields.phone || '').replace(/\D/g, '').length < 9) { $('.quote-form-status').textContent = 'Для надсилання вкажіть телефон клієнта.'; quoteField('phone').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fields.email || '').trim())) { $('.quote-form-status').textContent = 'Для надсилання вкажіть коректний email клієнта.'; quoteField('email').focus(); return; }
    if (!namedItems.length || namedItems.length !== quoteDraftItems.length) { $('.quote-form-status').textContent = 'Для надсилання додайте щонайменше одну позицію та заповніть усі назви.'; $('#quote-items input[data-field="name"]')?.focus(); return; }
  }
  const payload = { customerName:fields.customerName, company:fields.company, email:fields.email, phone:fields.phone, city:fields.city, validUntil:fields.validUntil, currency:fields.currency, note:fields.note, items:quoteDraftItems, status:normalizedQuoteStatus(fields.status || activeQuote?.status || 'draft'), sourceLeadId:quoteSourceLeadId };
  if (quoteIsOwner(activeQuote)) payload.sharedWith = selectedQuoteAccess();
  setBusy(button, true); $('.quote-form-status').textContent = action === 'send' ? 'Зберігаємо та надсилаємо…' : 'Зберігаємо…';
  try {
    const saved = await api(activeQuote ? `/api/quotes/${activeQuote._id}` : '/api/quotes', { method:activeQuote ? 'PATCH' : 'POST', body:JSON.stringify(payload) });
    let sent = null;
    if (action === 'send') sent = await api(`/api/quotes/${saved._id}/send`, { method:'POST', body:JSON.stringify({}) });
    await loadCollection('quotes'); renderQuotes(); quoteDialog.close();
    if (sent?.publicUrl) showQuoteShare(sent.publicUrl, sent.emailDelivered);
  } catch (error) {
    await loadCollection('quotes').catch(() => {}); renderQuotes(); $('.quote-form-status').textContent = action === 'send' ? `Пропозицію збережено, але email не надіслано: ${error.message}` : `Помилка: ${error.message}`;
  } finally { if (button?.isConnected) setBusy(button, false); }
});

$$('.quote-share-close').forEach(button => button.addEventListener('click', () => $('#quote-share-dialog').close()));
$('#quote-share-copy')?.addEventListener('click', async () => { await copyText($('#quote-share-url').value); showApiNotice('Публічне посилання скопійовано.'); });
$('#quote-share-open')?.addEventListener('click', () => window.open($('#quote-share-url').value, '_blank', 'noopener'));
$('#quote-share-native')?.addEventListener('click', () => { const menu = $('#quote-share-menu'); menu.hidden = !menu.hidden; $('#quote-share-native').setAttribute('aria-expanded', String(!menu.hidden)); });
$('#quote-share-system')?.addEventListener('click', () => navigator.share?.({ title:'Комерційна пропозиція Voltares', text:'Комерційна пропозиція Voltares', url:$('#quote-share-url').value }).catch(() => {}));
$$('#quote-share-menu a, #quote-share-menu button').forEach(item => item.addEventListener('click', () => { $('#quote-share-menu').hidden = true; $('#quote-share-native').setAttribute('aria-expanded', 'false'); }));
document.addEventListener('pointerdown', event => { if (!event.target.closest('.quote-share-picker')) { $('#quote-share-menu')?.setAttribute('hidden', ''); $('#quote-share-native')?.setAttribute('aria-expanded', 'false'); } });

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
  ({ leads: renderLeads, reviews: renderReviews, questions: renderQuestions, faqs: renderFaqs, projects: renderProjects, articles: renderArticles, equipment: renderEquipment, solarPanels:renderSolarPanels, greenProtect:renderGreenProtect, quotes:renderQuotes, purchases:renderPurchases, users: renderUsers }[type])?.();
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
  equipment: { title: 'модель обладнання', fields: [['brand', 'Бренд', 'text', true], ['model', 'Модель', 'text', true], ['power', 'Потужність', 'text'], ['phase', 'Фази / Тип', 'choice', false, ['1 фаза', '3 фази', 'LiFePO₄', 'HV']], ['voltage', 'Напруга', 'text'], ['price', 'Роздрібна ціна, грн', 'text'], ['priceUsd', 'Роздрібна ціна, USD', 'number'], ['purchasePrice', 'Закупівельна ціна (лише CRM)', 'number'], ['purchaseCurrency', 'Валюта закупівлі', 'select', false, ['USD', 'EUR', 'UAH']], ['homeMode', 'Показ на головній', 'select', false, ['auto', 'featured', 'hidden']], ['description', 'Опис для сайту', 'textarea'], ['imageFiles', 'Фото моделі (можна кілька)', 'files'], ['status', 'Статус', 'select', false, ['active', 'review', 'draft']]] },
  solarPanels: { title: 'сонячну панель', fields: [['brand', 'Бренд', 'text', true], ['model', 'Модель', 'text', true], ['power', 'Потужність', 'text', true], ['technology', 'Технологія / тип', 'text'], ['price', 'Роздрібна ціна, грн', 'text'], ['priceUsd', 'Роздрібна ціна, USD', 'number'], ['purchasePrice', 'Закупівельна ціна (лише CRM)', 'number'], ['purchaseCurrency', 'Валюта закупівлі', 'select', false, ['USD', 'EUR', 'UAH']], ['description', 'Короткий опис', 'textarea'], ['imageFiles', 'Фото панелі', 'files'], ['status', 'Статус', 'select', false, ['active', 'review', 'draft']]] },
  greenProtect: { title: 'компонент Green Protect', fields: [['code', 'Код ETI', 'text', true], ['model', 'Назва', 'text', true], ['category', 'Категорія', 'select', false, ['Автоматичні вимикачі', 'Запобіжники gPV', 'Тримачі запобіжників', 'Захист від перенапруги', 'DC роз’єднувачі', 'Рубильники навантаження']], ['spec', 'Короткі характеристики', 'text'], ['listPrice', 'Ціна прайса ETI, грн', 'number'], ['purchasePrice', 'Закупівельна ціна, грн (−35%, лише CRM)', 'number'], ['price', 'Ціна сайту, грн (−15%)', 'text'], ['sourceUrl', 'Офіційне джерело', 'url'], ['imageFiles', 'Фото (необов’язково)', 'files'], ['status', 'Статус', 'select', false, ['active', 'review', 'draft']]] },
  purchases: { title: 'закупівлю', fields: [['supplier', 'Постачальник', 'text', true], ['date', 'Дата закупівлі', 'date'], ['amount', 'Сума', 'number'], ['currency', 'Валюта', 'select', false, ['UAH', 'USD', 'EUR']], ['customer', 'Замовник (необов’язково)', 'text'], ['list', 'Список товарів / робіт', 'textarea'], ['comment', 'Коментар', 'textarea'], ['attachmentFiles', 'Рахунок, інвойс, чек або список', 'attachments'], ['status', 'Статус', 'select', false, ['planned', 'ordered', 'received', 'cancelled']]] },
  users: { title: 'користувача CRM', fields: [['username', "Ім'я користувача", 'text', true], ['password', 'Новий пароль (мінімум 8 символів)', 'password'], ['status', 'Доступ', 'select', false, ['active', 'disabled']]] }
};

function fieldTemplate([name, label, type, required, options = []], item = {}) {
  if (type === 'textarea') return `<label>${label}<textarea name="${name}" rows="4" ${required ? 'required' : ''}>${escapeHtml(item[name] || '')}</textarea></label>`;
  if (type === 'select') return `<label>${label}<select name="${name}">${options.map(option => `<option value="${option}" ${item[name] === option ? 'selected' : ''}>${escapeHtml(statusLabels[option]?.[0] || option)}</option>`).join('')}</select></label>`;
  if (type === 'choice') {
    const current = String(item[name] || '').trim();
    const knownValue = options.includes(current);
    const customOption = current && !knownValue ? `<option value="${escapeHtml(current)}" data-custom-choice selected>${escapeHtml(current)}</option>` : '';
    return `<label class="choice-custom-field">${label}<input name="${name}Custom" type="text" data-choice-custom value="${knownValue ? '' : escapeHtml(current)}" placeholder="Вкажіть фази або тип" hidden disabled><select name="${name}" data-choice-name="${name}"><option value="" disabled ${current ? '' : 'selected'}>Оберіть значення</option>${options.map(option => `<option value="${escapeHtml(option)}" ${current === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}${customOption}<option value="__manual__">Інше — вписати вручну</option></select></label>`;
  }
  if (type === 'file') return `<label>${label}<input name="${name}" type="file" accept="image/png,image/jpeg,image/webp"><small>${item.image ? `Поточне фото: ${escapeHtml(item.image)}` : 'PNG, JPG або WebP'}</small></label>`;
  if (type === 'files') return `<label>${label}<input name="${name}" type="file" accept="image/png,image/jpeg,image/webp" multiple><small>${item.images?.length ? `Збережено фото: ${item.images.length}` : 'PNG, JPG або WebP; можна вибрати кілька файлів одночасно'}</small></label>`;
  if (type === 'attachments') return `<label>${label}<input name="${name}" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,.xlsx,.xls" multiple><small>${item.attachments?.length ? `Збережено файлів: ${item.attachments.length}. Нові файли буде додано.` : 'PDF, фото, TXT, CSV або Excel; до 4 МБ кожен'}</small></label>`;
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(item[name] ?? '')}" ${type === 'number' ? 'min="0" step="0.01" inputmode="decimal"' : ''} ${required ? 'required' : ''}></label>`;
}

function openContentDialog(type, item = null) {
  activeType = type;
  activeItem = item;
  const config = configs[type];
  const ownPasswordOnly = type === 'users' && currentAdmin?.role !== 'admin';
  const fields = ownPasswordOnly ? [['password', 'Новий пароль (мінімум 8 символів)', 'password', true]] : config.fields;
  dialog.dataset.type = type;
  dialogTitle.textContent = ownPasswordOnly ? 'Змінити власний пароль' : `${item ? 'Редагувати' : 'Створити'}: ${config.title}`;
  const fieldsMarkup = fields.map(field => fieldTemplate(field, item || {})).join('');
  const leadLayout = type === 'leads' ? `<div class="lead-dialog-grid"><div class="lead-dialog-fields">${fieldsMarkup}</div>${leadItemsPanel(item || {})}</div>` : fieldsMarkup;
  form.innerHTML = `${leadLayout}<div class="dialog-actions">${type === 'leads' && item ? '<button type="button" class="secondary-admin lead-dialog-print">Друк / PDF</button>' : ''}<button type="button" class="secondary-admin dialog-cancel">Скасувати</button><button type="submit" class="primary-admin">${ownPasswordOnly ? 'Змінити пароль' : item ? 'Зберегти зміни' : 'Створити'}</button></div>`;
  if (type === 'users') {
    const password = form.querySelector('input[name="password"]');
    password.required = ownPasswordOnly || !item;
    password.placeholder = ownPasswordOnly ? 'Щонайменше 8 символів' : item ? 'Залиште порожнім, щоб не змінювати' : 'Щонайменше 8 символів';
  }
  $$('[data-choice-name]', form).forEach(select => {
    const customInput = select.parentElement.querySelector('[data-choice-custom]');
    const setEditing = (editing, { focus = false } = {}) => {
      select.hidden = editing;
      customInput.hidden = !editing;
      customInput.disabled = !editing;
      select.parentElement.classList.toggle('is-custom', editing);
      if (editing && focus) customInput.focus();
    };
    const updateCustomOption = () => {
      const value = customInput.value.trim();
      let option = select.querySelector('[data-custom-choice]');
      if (!value) {
        if (option) option.remove();
        select.value = '';
        return;
      }
      if (!option) {
        option = document.createElement('option');
        option.dataset.customChoice = '';
        select.insertBefore(option, select.querySelector('option[value="__manual__"]'));
      }
      option.value = value;
      option.textContent = value;
      option.selected = true;
    };
    select.addEventListener('change', () => setEditing(select.value === '__manual__', { focus:true }));
    customInput.addEventListener('input', updateCustomOption);
    customInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      updateCustomOption();
      if (customInput.value.trim()) setEditing(false);
    });
    customInput.addEventListener('blur', () => {
      updateCustomOption();
      if (customInput.value.trim()) setEditing(false);
    });
    setEditing(false);
  });
  $('.lead-dialog-print', form)?.addEventListener('click', () => openPrintDocument(leadPrintDocument(item || {}), 'Браузер заблокував вікно друку. Дозвольте спливні вікна для CRM.'));
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
  const submitButton = event.submitter || form.querySelector('button[type="submit"]');
  setBusy(submitButton, true);
  try {
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
    if (activeType === 'equipment') {
      const manualPhase = String(data.phaseCustom || '').trim();
      data.phase = String(data.phase || '').trim() === '__manual__' ? manualPhase : String(data.phase || '').trim();
      delete data.phaseCustom;
      data.homeMode = ['auto', 'featured', 'hidden'].includes(data.homeMode) ? data.homeMode : 'auto';
      if (data.homeMode === 'featured' && activeItem?.homeMode !== 'featured') data.homeOrder = Math.max(0, ...state.equipment.filter(item => item.homeMode === 'featured').map(item => Number(item.homeOrder || 0))) + 1;
    }
    if (activeType === 'solarPanels') data.phase = data.technology || '';
    if (activeType === 'greenProtect') {
      data.brand = 'ETI'; data.name = data.model; data.phase = data.category; data.power = data.spec;
      if (Number(data.listPrice) > 0) {
        data.purchasePrice = Math.round(Number(data.listPrice) * 0.65);
        data.purchaseCurrency = 'UAH';
        if (!String(data.price || '').trim()) data.price = `${Math.round(Number(data.listPrice) * 0.85).toLocaleString('uk-UA')} грн`;
      }
    }
    const fileInput = form.querySelector('input[type="file"]');
    const files = [...(fileInput?.files || [])];
    delete data.imageFile;
    delete data.imageFiles;
    delete data.attachmentFiles;
    if (activeType === 'purchases') {
      const attachments = [...(Array.isArray(activeItem?.attachments) ? activeItem.attachments : [])];
      for (const selectedFile of files) {
        const upload = await api('/api/attachments', { method: 'POST', body: JSON.stringify({ dataUrl: await fileToDataUrl(selectedFile) }) });
        attachments.push({ url: upload.url, name: selectedFile.name, type: selectedFile.type, size: selectedFile.size });
      }
      data.attachments = attachments;
    } else if (files.length) {
      const images = [];
      for (const selectedFile of files) {
        const upload = await api('/api/uploads', { method: 'POST', body: JSON.stringify({ dataUrl: await fileToDataUrl(selectedFile) }) });
        images.push(upload.url);
      }
      data.images = images;
      if (!['equipment','solarPanels','greenProtect'].includes(activeType)) data.image = images[0];
    } else if (activeItem) {
      const existingImages = [...new Set([...(Array.isArray(activeItem.images) ? activeItem.images : []), activeItem.image].filter(Boolean))];
      if (existingImages.length) {
        data.images = existingImages;
        if (!['equipment','solarPanels','greenProtect'].includes(activeType)) data.image = existingImages[0];
      }
    }
    if (['equipment','solarPanels','greenProtect'].includes(activeType)) delete data.image;
    const path = activeItem ? `/api/${activeType}/${activeItem._id}` : `/api/${activeType}`;
    await api(path, { method: activeItem ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    await loadCollection(activeType);
    await refreshDashboard();
    renderByType(activeType);
    dialog.close();
  } catch (error) {
    showApiNotice(error.message === 'API_NOT_FOUND' ? 'Маршрут FAQ відсутній у запущеній версії сервера. Перезапустіть npm start або зробіть новий deploy.' : `Помилка збереження: ${error.message}`);
  } finally { if (submitButton.isConnected) setBusy(submitButton, false); }
});

$$('.admin-nav').forEach(button => button.addEventListener('click', () => openView(button.dataset.view)));
$$('[data-open-view]').forEach(button => button.addEventListener('click', () => openView(button.dataset.openView)));
$('.admin-menu')?.addEventListener('click', () => $('.admin-sidebar').classList.toggle('is-open'));
$('#review-filter')?.addEventListener('change', renderReviews);
$('#lead-search')?.addEventListener('input', renderLeads);
$('#lead-status-filter')?.addEventListener('change', renderLeads);
$('#lead-select-all')?.addEventListener('change', event => {
  visibleLeadIds.forEach(id => {
    if (event.currentTarget.checked) selectedLeadIds.add(id);
    else selectedLeadIds.delete(id);
  });
  renderLeads();
});
$('#lead-bulk-delete')?.addEventListener('click', async event => {
  const button = event.currentTarget;
  const ids = [...selectedLeadIds];
  if (!ids.length || !confirm(`Видалити вибрані заявки (${ids.length})? Цю дію не можна скасувати.`)) return;
  setBusy(button, true);
  try {
    const result = await api('/api/leads/bulk-delete', { method:'POST', body:JSON.stringify({ ids }) });
    selectedLeadIds.clear();
    await loadCollection('leads');
    await refreshDashboard();
    renderLeads();
    showApiNotice(`Видалено заявок: ${Number(result.deleted || 0)}.`);
  } catch (error) {
    showApiNotice(`Не вдалося видалити вибрані заявки: ${error.message}`);
  } finally {
    if (button.isConnected) setBusy(button, false);
  }
});
$('#add-lead')?.addEventListener('click', () => openContentDialog('leads'));
$('#add-quote')?.addEventListener('click', () => openQuoteDialog());
$('#add-purchase')?.addEventListener('click', () => openContentDialog('purchases'));
$('#add-question')?.addEventListener('click', () => openContentDialog('questions'));
$('#add-faq')?.addEventListener('click', () => openContentDialog('faqs'));
$('#add-project')?.addEventListener('click', () => openContentDialog('projects'));
$('#add-article')?.addEventListener('click', () => openContentDialog('articles'));
$('#add-equipment')?.addEventListener('click', () => openContentDialog('equipment'));
$('#add-solar-panel')?.addEventListener('click', () => openContentDialog('solarPanels'));
$('#add-green-protect')?.addEventListener('click', () => openContentDialog('greenProtect'));
$('#add-user')?.addEventListener('click', () => openContentDialog('users'));
$('.dialog-x')?.addEventListener('click', () => dialog.close());
$('.admin-image-close')?.addEventListener('click', () => imageDialog.close());
$('.admin-image-prev')?.addEventListener('click', () => moveEquipmentImage(-1));
$('.admin-image-next')?.addEventListener('click', () => moveEquipmentImage(1));
$('.admin-image-zoom')?.addEventListener('click', toggleEquipmentImageZoom);
imagePreview?.addEventListener('click', toggleEquipmentImageZoom);
imageDialog?.addEventListener('click', event => {
  if (event.target === imageDialog) imageDialog.close();
});
imageDialog?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') moveEquipmentImage(-1);
  if (event.key === 'ArrowRight') moveEquipmentImage(1);
});
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
    return loadAll().then(startCrmPolling);
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
