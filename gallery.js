const grid = document.querySelector('#gallery-grid');
const dialog = document.querySelector('.gallery-dialog');
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));

function bindGallery() {
  document.querySelectorAll('.gallery-item').forEach(item => item.addEventListener('click', () => {
    dialog.querySelector('img').src = item.dataset.image;
    dialog.querySelector('img').alt = item.querySelector('img').alt;
    dialog.showModal();
  }));
}

async function loadGallery() {
  const response = await fetch('/api/projects').catch(() => null);
  const projects = response?.ok ? await response.json() : [];
  grid.innerHTML = projects.length ? projects.map(project => `
    <article class="gallery-item" data-image="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}">
      <img src="${escapeHtml(project.image || '/assets/projects/home-backup.jpg')}" alt="${escapeHtml(project.title)}">
      <div><span class="page-eyebrow">${escapeHtml(project.city || 'Україна')} · ${escapeHtml(project.type || 'об’єкт')}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.description || '')}</p></div>
    </article>`).join('') : '<p class="page-lead">Поки немає опублікованих об’єктів. Додайте їх в адмінці.</p>';
  bindGallery();
}

dialog.querySelector('button').onclick = () => dialog.close();
dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
loadGallery();
