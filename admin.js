const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const titles = { dashboard:'Огляд', leads:'Заявки', reviews:'Відгуки', projects:"Об'єкти", articles:'Статті', equipment:'Обладнання', settings:'Налаштування' };
function openView(view) {
  $$('.admin-nav').forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
  $$('.admin-view').forEach(page => page.classList.toggle('is-active', page.dataset.page === view));
  $('#view-title').textContent = titles[view];
  $('.admin-sidebar').classList.remove('is-open');
}
$$('.admin-nav').forEach(button => button.addEventListener('click', () => openView(button.dataset.view)));
$$('[data-open-view]').forEach(button => button.addEventListener('click', () => openView(button.dataset.openView)));
$('.admin-menu').addEventListener('click', () => $('.admin-sidebar').classList.toggle('is-open'));

const statusOrder = [
  { text:'Нова', cls:'status-new' },
  { text:'В роботі', cls:'status-work' },
  { text:'Розрахунок', cls:'status-calc' },
  { text:'Завершена', cls:'status-done' }
];
$$('.status-cycle').forEach(button => button.addEventListener('click', () => {
  const index = statusOrder.findIndex(item => button.classList.contains(item.cls));
  const next = statusOrder[(index + 1) % statusOrder.length];
  statusOrder.forEach(item => button.classList.remove(item.cls));
  button.classList.add(next.cls);
  button.textContent = next.text;
}));

const baseReviews = [
  { name:'Олександр К.', city:'Київщина', rating:5, text:'Після монтажу вперше не дізнались про відключення від сусідів.', reply:'Саме заради цього «не помітили» ми й проєктували запас для насоса.', status:'published' },
  { name:'Ірина П.', city:'Одеса', rating:4, text:'Усе працює, але хотілося б детальнішу інструкцію до застосунку.', reply:'', status:'waiting' }
];
let localReviews = [];
try { localReviews = JSON.parse(localStorage.getItem('voltera-reviews') || '[]').map(item => ({...item, reply:'', status:'waiting'})); } catch (error) { localReviews = []; }
const allReviews = [...localReviews, ...baseReviews];

function renderReviews(filter = 'all') {
  const list = $('#moderation-list');
  list.innerHTML = '';
  allReviews.filter(item => filter === 'all' || item.status === filter).forEach((item, index) => {
    const article = document.createElement('article');
    article.className = 'moderation-item';
    const initials = item.name.split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase();
    article.innerHTML = `<div class="moderation-avatar">${initials}</div><div><span class="view-caption">${'★'.repeat(Number(item.rating))} · ${item.status === 'waiting' ? 'ЧЕКАЄ ВІДПОВІДІ' : 'ОПУБЛІКОВАНО'}</span><h3></h3><p></p><small></small></div><div class="review-editor"><textarea rows="3" placeholder="Відповідь компанії"></textarea><div><button class="secondary-admin review-hide" type="button">Приховати</button><button class="primary-admin review-publish" type="button">Зберегти відповідь</button></div></div>`;
    $('h3', article).textContent = item.name;
    $('p', article).textContent = `«${item.text}»`;
    $('small', article).textContent = item.city || 'Місто не вказано';
    $('textarea', article).value = item.reply || '';
    $('.review-publish', article).addEventListener('click', () => { item.reply = $('textarea', article).value; item.status = 'published'; renderReviews($('#review-filter').value); });
    $('.review-hide', article).addEventListener('click', () => { const actualIndex = allReviews.indexOf(item); if (actualIndex >= 0) allReviews.splice(actualIndex, 1); renderReviews($('#review-filter').value); });
    list.append(article);
  });
  $('#review-badge').textContent = allReviews.filter(item => item.status === 'waiting').length;
}
renderReviews();
$('#review-filter').addEventListener('change', event => renderReviews(event.target.value));

const dialog = $('#content-dialog');
let contentType = 'Матеріал';
function openContentDialog(type) { contentType = type; $('#dialog-title').textContent = `Створити: ${type}`; dialog.showModal(); }
$('#add-project').addEventListener('click', () => openContentDialog("об'єкт"));
$('#add-article').addEventListener('click', () => openContentDialog('статтю'));
$('#add-equipment').addEventListener('click', () => openContentDialog('модель обладнання'));
$('#add-lead').addEventListener('click', () => openContentDialog('заявку'));
$('.dialog-x').addEventListener('click', () => dialog.close());
$('.dialog-cancel').addEventListener('click', () => dialog.close());
$('#content-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const title = new FormData(event.currentTarget).get('title');
  localStorage.setItem('ink-admin-last-draft', JSON.stringify({ type:contentType, title, savedAt:new Date().toISOString() }));
  dialog.close();
  event.currentTarget.reset();
});
$('.save-settings').addEventListener('click', event => { event.currentTarget.textContent = 'Збережено ✓'; setTimeout(() => { event.currentTarget.textContent = 'Зберегти зміни'; }, 1600); });
