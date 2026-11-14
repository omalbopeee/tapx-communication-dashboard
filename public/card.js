import { cardStore } from './storage.js';
import { clone, makeVCard } from './model.js';
import { renderHub } from './render.js';
import { mountHub } from './hub-runtime.js';

const root = document.getElementById('hub-root');
const preview = new URLSearchParams(location.search).has('preview');
let current, dispose;
function render(card) {
  const open = [...root.querySelectorAll('dialog[open]')].map(el => el.id);
  const outsideFocus = preview && window.frameElement && parent.document.activeElement !== window.frameElement ? parent.document.activeElement : null;
  dispose?.();
  document.body.classList.remove('dialog-open');
  current = clone(card);
  root.innerHTML = renderHub(current);
  document.title = current.displayName + ' | Communication Hub';
  const properties = { canvas: '--canvas', surface: '--surface', ink: '--ink', accent: '--tapx', soft: '--soft', line: '--line' };
  for (const [key, property] of Object.entries(properties)) if (/^#[a-f\d]{6}$/i.test(current.design[key])) document.documentElement.style.setProperty(property, current.design[key]);
  root.querySelector('.business-logo-frame').hidden = !current.design.showLogo;
  const socialTitle = root.querySelector('#social-dialog-title'), socialDescription = root.querySelector('#social-dialog-description');
  if (socialTitle) socialTitle.textContent = current.wording.socialTitle;
  if (socialDescription) socialDescription.textContent = current.wording.socialDescription;
  dispose = mountHub();
  for (const id of open) { const dialog = document.getElementById(id); if (dialog) { dialog.showModal(); document.body.classList.add('dialog-open'); } }
  outsideFocus?.focus({ preventScroll: true });
}
root.addEventListener('click', event => {
  if (!event.target.closest('.save-contact') || !current) return;
  event.preventDefault();
  const blob = URL.createObjectURL(new Blob([makeVCard(current)], { type: 'text/vcard;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = blob; anchor.download = current.contactFilename;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(blob), 1000);
});
if (preview) {
  window.addEventListener('message', event => { if (event.source === parent && event.origin === location.origin && event.data?.type === 'tapx:render') render(event.data.card); });
  parent.postMessage({ type: 'tapx:ready' }, location.origin);
} else {
  try { render(cardStore.read().card); }
  catch (error) { root.replaceChildren(Object.assign(document.createElement('p'), { className: 'load-error', textContent: error.message })); }
}
window.addEventListener('pagehide', () => dispose?.());
