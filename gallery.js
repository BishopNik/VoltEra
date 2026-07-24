const grid = document.querySelector('#gallery-grid');
const dialog = document.querySelector('.gallery-dialog');
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
let projectsById = new Map();
const isPublished = project => ['published', 'active'].includes(String(project?.status || '').trim().toLowerCase());
const imagesFor = project => [...new Set([project.primaryImage, project.image, ...(Array.isArray(project.images) ? project.images : [])].filter(Boolean))];
const plainText = value => String(value || '').replace(/#{1,4}\s+/g, '').replace(/\*\*|__/g, '').replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '').replace(/\s+/g, ' ').trim();
const richText = value => String(value || '').replace(/\r/g, '').split(/\n{2,}/).map(block => `<p>${escapeHtml(block).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`).join('');

function bindGallery() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    const open = () => {
      const project = projectsById.get(item.dataset.project);
      if (!project) return;
      const images = imagesFor(project);
      const mainImage = dialog.querySelector('.gallery-dialog-media>img');
      mainImage.src = images[0] || '/assets/projects/home-backup.jpg';
      mainImage.alt = project.title || 'Фото об’єкта';
      dialog.querySelector('h2').textContent = project.title || 'Об’єкт Voltares';
      dialog.querySelector('.gallery-dialog-copy').innerHTML = richText(project.description || '');
      const thumbs = dialog.querySelector('.gallery-dialog-thumbs');
      thumbs.innerHTML = images.length > 1 ? images.map((src, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}" data-image="${escapeHtml(src)}" aria-label="Показати фото ${index + 1}"><img src="${escapeHtml(src)}" alt=""></button>`).join('') : '';
      thumbs.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', event => {
        event.stopPropagation();
        mainImage.src = button.dataset.image;
        thumbs.querySelectorAll('button').forEach(thumb => thumb.classList.toggle('is-active', thumb === button));
      }));
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
  const response = await fetch('/api/projects', { cache:'no-store' }).catch(() => null);
  const source = response?.ok ? await response.json() : [];
  const projects = Array.isArray(source) ? source.filter(isPublished) : [];
  projectsById = new Map(projects.map((project, index) => [String(project._id || index), project]));
  grid.innerHTML = projects.length ? projects.map((project, index) => {
    const id = String(project._id || index);
    const images = imagesFor(project);
    const preview = (images.length ? images : ['/assets/projects/home-backup.jpg']).slice(0, 3);
    return `
    <article class="gallery-item" role="button" tabindex="0" data-project="${escapeHtml(id)}" aria-label="Відкрити об'єкт ${escapeHtml(project.title)}">
      <div class="gallery-item-media gallery-item-media-${preview.length}">${preview.map((src, imageIndex) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(imageIndex ? `${project.title}, фото ${imageIndex + 1}` : project.title)}">`).join('')}${images.length > 3 ? `<b>+${images.length - 3}</b>` : ''}</div>
      <div><span class="page-eyebrow">${escapeHtml(project.city || 'Україна')} · ${escapeHtml(project.type || 'об’єкт')} · Реалізований</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(plainText(project.description || ''))}</p></div>
    </article>`;
  }).join('') : '<div class="section-empty"><div><strong>Галерея заповнюється</strong>Нові об’єкти з’являться після публікації.</div></div>';
  bindGallery();
}

dialog.querySelector('button').onclick = () => dialog.close();
dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
loadGallery();
