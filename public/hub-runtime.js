export function mountHub() {
  const controller = new AbortController();
  let hoursInterval;
  'use strict';
  const readData = id => {
    const el = document.getElementById(id);
    return el ? JSON.parse(el.textContent) : {};
  };
  const hours = readData('hours-data');
  const bank = readData('bank-data');
  const page = readData('page-data');
  const dialog = document.querySelector('#bank-dialog');
  const bankTrigger = document.querySelector('#open-bank-dialog');
  const closeBank = document.querySelector('#close-bank-dialog');
  const bankStatus = document.querySelector('#bank-copy-status');
  let toastTimeout;

  async function copyText(value) {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch { /* Try selection-based copying when permission is denied. */ }
    const field = document.createElement('textarea');
    const previouslyFocused = document.activeElement;
    field.value = value;
    field.setAttribute('readonly', '');
    field.className = 'clipboard-field';
    field.setAttribute('aria-label', 'Text to copy');
    // Keep the fallback inside a modal, outside elements are inert while it is open.
    (dialog?.open ? dialog : document.body).append(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, field.value.length);
    let copied = false;
    try { copied = document.execCommand('copy'); }
    finally { field.remove(); previouslyFocused?.focus({ preventScroll: true }); }
    if (!copied) throw new Error('Copy unavailable');
  }

  function toast(message) {
    const el = document.querySelector('#toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('is-visible'), 3500);
  }

  function showBankStatus(message, isError = false) {
    if (!bankStatus) return;
    bankStatus.textContent = message;
    bankStatus.classList.toggle('is-error', isError);
  }

  function setupDialog(modal, trigger, closeButton) {
    trigger?.addEventListener('click', () => {
      if (!modal || modal.open) return;
      modal.showModal();
      modal.scrollTop = 0;
      document.body.classList.add('dialog-open');
      closeButton?.focus({ preventScroll: true });
    });
    closeButton?.addEventListener('click', () => modal.close());
    modal?.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
      trigger?.focus({ preventScroll: true });
    });
    modal?.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal)) {
        event.preventDefault(); first?.focus();
      }
    });
    // A click on dialog padding is not a backdrop click.
    modal?.addEventListener('click', event => {
      const box = modal.getBoundingClientRect();
      if (event.target === modal && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) modal.close();
    });
  }
  setupDialog(dialog, bankTrigger, closeBank);
  setupDialog(document.querySelector('#logo-dialog'), document.querySelector('#open-logo-dialog'), document.querySelector('#close-logo-dialog'));
  setupDialog(document.querySelector('#social-dialog'), document.querySelector('#open-social-dialog'), document.querySelector('#close-social-dialog'));

  const demoDialog = document.querySelector('#demo-dialog');
  let demoTrigger;
  setupDialog(demoDialog, null, document.querySelector('#close-demo-dialog'));
  const descriptions = {
    'Google Review': 'Let customers open your Google review page with one tap. This preview does not submit a review.',
    'Location': 'Help customers find your business on Google Maps with one tap.',
    'Email': 'Let customers start an email to your business with one tap.',
    'Facebook': 'Connect customers to your Facebook page with one tap.',
    'Instagram': 'Connect customers to your Instagram profile with one tap.',
    'TikTok': 'Connect customers to your TikTok profile with one tap.'
  };
  document.querySelectorAll('[data-demo]').forEach(button => {
    button.addEventListener('click', () => {
      demoTrigger = button;
      document.querySelector('#demo-title').textContent = button.dataset.demo + ' Demo';
      document.querySelector('#demo-description').textContent = (descriptions[button.dataset.demo] || 'Let customers open this business link with one tap.') + ' Your own business link will be used on your page.';
      demoDialog.showModal();
      document.body.classList.add('dialog-open');
      document.querySelector('#close-demo-dialog').focus({preventScroll:true});
    });
  });
  demoDialog?.addEventListener('close', () => demoTrigger?.focus({preventScroll:true}));

  document.querySelectorAll('[data-copy-account]').forEach(button => {
    button.addEventListener('click', async () => {
      const account = bank.accounts?.[Number(button.dataset.copyAccount)];
      if (!account) return;
      try {
        await copyText(String(account.accountNumber));
        document.querySelectorAll('[data-copy-account]').forEach(item => {
          item.classList.remove('is-copied');
          item.textContent = 'Copy account number';
        });
        button.classList.add('is-copied');
        button.textContent = 'Account number copied';
        showBankStatus(`${account.bankName} account number copied.`);
      } catch {
        showBankStatus('Could not copy. Select the account number and copy it manually.', true);
      }
    });
  });
  document.querySelector('#copy-all-bank-details')?.addEventListener('click', async () => {
    if (!bank.accounts?.length) return;
    const lines = [bank.businessName + ' — Bank Details'];
    for (const account of bank.accounts) {
      lines.push('', `Bank: ${account.bankName}`, `Account Name: ${account.accountName}`, `Account Number: ${account.accountNumber}`, `Branch: ${account.branch}`);
      if (account.branchCode) lines.push(`Branch Code: ${account.branchCode}`);
    }
    try { await copyText(lines.join('\n')); showBankStatus('All bank details copied.'); }
    catch { showBankStatus('Could not copy. Select the details and copy them manually.', true); }
  });

  document.querySelector('#share-button')?.addEventListener('click', async () => {
    const shareUrl = new URL('./card.html', window.location.href).href;
    const details = { title: page.name, url: shareUrl };
    if (navigator.share) {
      try { await navigator.share(details); return; }
      catch (err) { if (err.name === 'AbortError') return; }
    }
    try { await copyText(shareUrl); toast('Business link copied. Ready to share.'); }
    catch { toast('Copy the page address from your browser to share.'); }
  });

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const minutes = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
  const formatTime = value => {
    const h = Math.floor(value / 60) % 24;
    const m = value % 60;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  function updateBusinessStatus() {
    const el = document.querySelector('#business-status');
    if (!el || !hours.enabled) return;
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: hours.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date()).map(part => [part.type, part.value]));
      const day = weekdays.indexOf(parts.weekday);
      const now = Number(parts.hour) * 60 + Number(parts.minute);
      // Put this week and the following week on one continuous minute timeline.
      // Merge touching/overlapping intervals, including overnight opening hours.
      const intervals = [];
      for (let offset = -1; offset <= 7; offset++) {
        const key = (day + offset + 7) % 7;
        for (const [from, to] of hours.weekly[key] || []) {
          const start = minutes(from), end = minutes(to);
          intervals.push([offset * 1440 + start, offset * 1440 + end + (end < start ? 1440 : 0)]);
        }
      }
      intervals.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const interval of intervals) {
        const last = merged.at(-1);
        if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
        else merged.push([...interval]);
      }
      const active = merged.find(([start, end]) => now >= start && now < end);
      const next = merged.find(([start]) => start > now);
      const text = document.querySelector('#status-text');
      const detail = document.querySelector('#status-detail');
      el.classList.toggle('is-open', Boolean(active));
      text.textContent = active ? 'Open now' : 'Closed now';
      if (active) {
        const nextDay = Math.floor(active[1] / 1440);
        detail.textContent = 'Closes ' + (nextDay > 0 ? (nextDay === 1 ? 'tomorrow, ' : weekdays[(day + nextDay) % 7] + ', ') : '') + formatTime(active[1] % 1440);
      } else if (next) {
        const nextDay = Math.floor(next[0] / 1440);
        const when = nextDay === 0 ? '' : nextDay === 1 ? 'tomorrow, ' : weekdays[(day + nextDay) % 7] + ', ';
        detail.textContent = 'Opens ' + when + formatTime(next[0] % 1440);
      } else { detail.textContent = ''; }
      document.querySelector('#status-separator').hidden = !detail.textContent;
      el.hidden = false;
    } catch { el.hidden = true; }
  }
  if (hours.enabled) {
    updateBusinessStatus();
    hoursInterval = setInterval(updateBusinessStatus, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updateBusinessStatus(); }, { signal: controller.signal });
  }
  return () => { clearTimeout(toastTimeout); clearInterval(hoursInterval); controller.abort(); };
}
