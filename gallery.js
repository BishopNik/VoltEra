const grid = document.querySelector('#gallery-grid');
const dialog = document.querySelector('.gallery-dialog');
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));

function bindGallery() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    const open = () => {
      dialog.querySelector('img').src = item.dataset.image;
      dialog.querySelector('img').alt = item.querySelector('img').alt;
      dialog.showModal();
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
}

async function loadGallery() {
  grid.innerHTML = '<div class="section-loader"><i></i><span>Завантажуємо галерею…</span></div>';
  const response = await fetch('/api/projects').catch(() => null);
  const projects = response?.ok ? await response.json() : [];
  grid.innerHTML = projects.length ? projects.map(project => `
    <article class="gallery-item" role="button" tabindex="0" data-image="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}" aria-label="Відкрити об'єкт ${escapeHtml(project.title)}">
      <img src="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(project.title)}">
      <div><span class="page-eyebrow">${escapeHtml(project.city || 'Україна')} · ${escapeHtml(project.type || 'об’єкт')}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.description || '')}</p></div>
    </article>`).join('') : '<div class="section-empty"><div><strong>Галерея заповнюється</strong>Нові об’єкти з’являться після публікації.</div></div>';
  bindGallery();
}

dialog.querySelector('button').onclick = () => dialog.close();
dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
loadGallery();
