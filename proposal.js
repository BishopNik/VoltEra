(() => {
  const $ = selector => document.querySelector(selector);
  const token = location.pathname.match(/^\/proposal\/([a-f0-9]{64})\/?$/)?.[1] || '';
  const isPreview = new URLSearchParams(location.search).get('preview') === '1';
  const money = (value, currency) => new Intl.NumberFormat('uk-UA', { style:'currency', currency, maximumFractionDigits:2 }).format(Number(value || 0));
  const date = value => value ? new Intl.DateTimeFormat('uk-UA', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(String(value).length === 10 ? `${value}T12:00:00` : value)) : '—';
  const dateTime = value => value ? new Intl.DateTimeFormat('uk-UA', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)) : '';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const errorCopy = {
    INVALID_LINK:['Посилання недійсне','Перевірте адресу або зверніться до менеджера Voltares.'],
    NOT_FOUND:['Пропозицію не знайдено','Можливо, посилання скопійовано не повністю. Зверніться до менеджера Voltares.'],
    LINK_REVOKED:['Ця комерційна пропозиція більше недоступна.','Зверніться до менеджера Voltares.']
  };
  let proposal = null;

  function showError(code = 'INVALID_LINK') {
    const [title, text] = errorCopy[code] || ['Не вдалося відкрити пропозицію','Спробуйте оновити сторінку або зверніться до менеджера Voltares.'];
    $('#proposal-loading').hidden = true; $('#proposal-content').hidden = true; $('#proposal-actions').hidden = true;
    $('#proposal-error-title').textContent = title; $('#proposal-error-text').textContent = text; $('#proposal-error').hidden = false;
  }

  function render(data) {
    proposal = data; document.title = `${data.number || 'Комерційна пропозиція'} | Voltares`;
    $('#proposal-number').textContent = data.number || '';
    $('#proposal-customer').textContent = [data.customer?.name, data.customer?.company].filter(Boolean).join(' · ') || 'клієнта';
    $('#proposal-created').textContent = date(data.createdAt); $('#proposal-valid').textContent = date(data.validUntil); $('#proposal-version').textContent = String(data.version || 1);
    $('#proposal-warning').hidden = !data.expired;
    const confirmed = data.status === 'confirmed'; $('#proposal-confirmed').hidden = !confirmed;
    $('#proposal-confirmed-at').textContent = confirmed && data.confirmedAt ? `Підтверджено ${dateTime(data.confirmedAt)}` : '';
    $('#proposal-items').innerHTML = (data.items || []).map(item => {
      const image = item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy">` : '<span>⚡</span>';
      const title = item.productUrl ? `<a href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>` : escapeHtml(item.name);
      const link = item.productUrl ? `<a class="product-link" href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener">Детальніше про товар ↗</a>` : '';
      return `<article class="proposal-item"><${item.productUrl ? 'a' : 'div'} class="proposal-item-media"${item.productUrl ? ` href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener"` : ''}>${image}</${item.productUrl ? 'a' : 'div'}><div class="proposal-item-copy"><h3>${title}</h3>${item.shortDescription ? `<p>${escapeHtml(item.shortDescription)}</p>` : ''}${link}</div><div class="proposal-item-price"><span class="proposal-item-label">Ціна</span><strong class="proposal-item-value">${escapeHtml(money(item.unitPrice, data.currency))}</strong>${item.discount ? `<small>Знижка ${escapeHtml(item.discount)}%</small>` : ''}</div><div class="proposal-item-quantity"><span class="proposal-item-label">Кількість</span><strong class="proposal-item-value">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</strong></div><strong class="proposal-item-total">${escapeHtml(money(item.total, data.currency))}</strong></article>`;
    }).join('');
    $('#proposal-total').textContent = money(data.subtotal, data.currency);
    if (data.note) { $('#proposal-note').textContent = data.note; $('#proposal-note-wrap').hidden = false; }
    $('#proposal-manager').textContent = data.manager?.name || 'Менеджер Voltares';
    $('#proposal-phone').textContent = data.manager?.phone || '+38 067 672 18 52'; $('#proposal-phone').href = `tel:${String(data.manager?.phone || '+380676721852').replace(/[^+\d]/g, '')}`;
    $('#proposal-email').textContent = data.manager?.email || 'ink.torg@gmail.com'; $('#proposal-email').href = `mailto:${data.manager?.email || 'ink.torg@gmail.com'}`;
    const closeButton = $('#proposal-close'); closeButton.disabled = isPreview;
    const confirmButton = $('#proposal-confirm'); confirmButton.disabled = isPreview || confirmed || data.expired || data.status === 'cancelled';
    if (confirmed) confirmButton.textContent = 'Пропозицію підтверджено'; else if (data.expired) confirmButton.textContent = 'Термін дії закінчився';
    $('#proposal-loading').hidden = true; $('#proposal-error').hidden = true; $('#proposal-content').hidden = false; $('#proposal-actions').hidden = false;
  }

  async function load() {
    if (!token) return showError('INVALID_LINK');
    try {
      const response = await fetch(`/api/public/proposals/${token}`, { headers:{ Accept:'application/json' }, cache:'no-store' });
      const data = await response.json().catch(() => ({})); if (!response.ok) return showError(data.error);
      render(data);
      const key = `proposal_viewed_${token}`;
      if (!isPreview && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        fetch(`/api/public/proposals/${token}/view`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:'{}', keepalive:true }).catch(() => {});
      }
    } catch { showError('NETWORK'); }
  }

  $('#proposal-confirm').addEventListener('click', () => { if (!isPreview) $('#confirm-dialog').showModal(); });
  $('#confirm-dialog').addEventListener('close', async () => {
    if ($('#confirm-dialog').returnValue !== 'confirm') return;
    const button = $('#proposal-confirm'); button.disabled = true; button.textContent = 'Підтверджуємо…';
    try {
      const response = await fetch(`/api/public/proposals/${token}/confirm`, { method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' }, body:'{}' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.error === 'PROPOSAL_EXPIRED') { proposal.expired = true; render(proposal); return; }
        if (data.error === 'LINK_REVOKED') return showError('LINK_REVOKED');
        throw new Error(data.error || 'CONFIRM_FAILED');
      }
      proposal.status = 'confirmed'; proposal.confirmedAt = data.confirmedAt || proposal.confirmedAt; render(proposal); $('#success-dialog').showModal();
    } catch { button.disabled = false; button.textContent = 'Спробувати підтвердити ще раз'; $('#proposal-toast').textContent = 'Не вдалося підтвердити пропозицію. Спробуйте ще раз.'; $('#proposal-toast').hidden = false; }
  });
  $('#proposal-close').addEventListener('click', () => { if (isPreview) return; window.close(); const toast = $('#proposal-toast'); toast.textContent = 'Ви можете закрити цю сторінку.'; toast.hidden = false; setTimeout(() => { toast.hidden = true; }, 5000); });
  load();
})();
