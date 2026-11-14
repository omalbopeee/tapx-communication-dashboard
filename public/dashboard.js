import { cardStore } from './storage.js';
import { DEFAULT_CARD, PLATFORMS, clone, escapeHTML, photoURL, validateCard, applyEditingPolicy } from './model.js';
import { icon } from './icons.js';
const $ = selector => document.querySelector(selector);
const e = escapeHTML;
const SECTIONS = [{"id":"business","label":"Business & logo","icon":"briefcase"},{"id":"contacts","label":"Contact & links","icon":"phone"},{"id":"bank","label":"Bank accounts","icon":"bank"},{"id":"social","label":"Social media","icon":"globe"},{"id":"hours","label":"Opening hours","icon":"clock"},{"id":"design","label":"Design & wording","icon":"palette"}];
const PRESETS = [{"name":"Original neutral","colors":["#202225","#dc263d","#f3f3f1","#ffffff","#f7f7f5","#e5e6e3"]},{"name":"Warm paper","colors":["#061e3f","#cf1526","#e7e3da","#fffdf7","#f3eee5","#ddd5c6"]},{"name":"Cool blue","colors":["#17314f","#cf1526","#edf2f7","#ffffff","#f3f6fa","#dce4ed"]}];
const COLOURS = ['ink', 'accent', 'canvas', 'surface', 'soft', 'line'];
const DRAFT_KEY = 'tapx-communication-draft-v1:' + new URL('.', import.meta.url).pathname;
let draft, saved, savedAt, revision = 0, section = 'business', saving = false, uploading = false;
let errors = [], toastTimer, previewTimer, draftTimer, recoveredDraft;
function get(path) { return path.split('.').reduce((value, key) => value?.[key], draft); }
function set(path, value) { const keys = path.split('.'); const last = keys.pop(); const target = keys.reduce((value, key) => value[key], draft); target[last] = value; }
function dirty() { return draft && saved && JSON.stringify(draft) !== JSON.stringify(saved); }
function uid() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
function toast(message, type = 'check') { const el = $('#app-toast'); el.innerHTML = `${icon(type)}<span>${e(message)}</span>`; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4000); }

function field(path, label, { type = 'text', wide = false, help = '', placeholder = '', required = false, options, rows = 3 } = {}) {
  const id = `field-${path.replaceAll('.', '-')}`;
  const error = errors.find(error => error.path === path);
  const attributes = `id="${id}" data-path="${path}" ${error ? 'aria-invalid="true"' : ''} aria-describedby="${id}-help ${id}-error" ${required ? 'required' : ''}`;
  let input;
  if (type === 'textarea') input = `<textarea ${attributes} rows="${rows}" placeholder="${e(placeholder)}">${e(get(path))}</textarea>`;
  else if (options) input = `<select ${attributes}>${Object.entries(options).map(([key, value]) => `<option value="${e(key)}" ${get(path) === key ? 'selected' : ''}>${e(value)}</option>`).join('')}</select>`;
  else input = `<input ${attributes} type="${type}" value="${e(get(path))}" placeholder="${e(placeholder)}" ${type === 'url' || type === 'email' ? 'spellcheck="false"' : ''}>`;
  return `<div class="field ${wide ? 'wide' : ''}"><label for="${id}">${e(label)}${required ? '<span class="required-mark">*</span>' : ''}</label>${input}<small class="field-help" id="${id}-help" ${help ? '' : 'hidden'}>${e(help)}</small><small class="field-error" id="${id}-error" ${error ? '' : 'hidden'}>${e(error?.message)}</small></div>`;
}
function toggle(path, label = 'Visible', hiddenLabel = '') { return `<label class="toggle-wrap"><input type="checkbox" data-path="${path}" ${get(path) ? 'checked' : ''} aria-label="${e(hiddenLabel || label)}"><span>${e(label)}</span></label>`; }
function heading(number, title, description, tag = '') { return `<div class="section-header"><div><div class="section-heading-line"><span class="section-number">${number}</span><h2>${e(title)}</h2></div><p>${e(description)}</p></div>${tag ? `<span class="small-tag">${e(tag)}</span>` : ''}</div>`; }
function controls(path, index, count, label) {
  return `<div class="entry-controls"><button class="icon-button move-up" type="button" data-move="${path}" data-index="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="Move ${e(label)} up">${icon('chevron')}</button><button class="icon-button move-down" type="button" data-move="${path}" data-index="${index}" data-direction="1" ${index === count - 1 ? 'disabled' : ''} aria-label="Move ${e(label)} down">${icon('chevron')}</button><button class="icon-button remove" type="button" data-remove="${path}" data-index="${index}" aria-label="Remove ${e(label)}">${icon('trash')}</button></div>`;
}
function addButton(path, label) { return `<button class="add-entry" type="button" data-add="${path}">${icon('plus')}${e(label)}</button>`; }
function nextButton() { const next = SECTIONS[SECTIONS.findIndex(s => s.id === section) + 1]; return next ? `<div class="section-next"><button class="text-button" type="button" data-section="${next.id}">Next: ${e(next.label)} ${icon('arrow')}</button></div>` : ''; }

function businessPanel() {
  const logo = photoURL(draft.logo);
  return `<section class="form-card">${heading('01', 'Business & logo', 'The business your customers connect with.', 'YOUR BUSINESS')}
    <div class="photo-editor"><img class="photo-avatar" src="${e(logo)}" alt="Current business logo"><div class="photo-copy"><strong>Your business logo</strong><p>JPG, PNG or WebP. Up to 10 MB.</p><div class="photo-buttons"><button class="button secondary" type="button" data-command="upload-photo">${icon('upload')}Change logo</button><button class="text-button" type="button" data-command="reset-logo">Use original</button></div></div></div><input type="file" id="photo-file" accept="image/jpeg,image/png,image/webp" hidden>
    <div class="form-grid">${field('name', 'Saved business name', { required: true })}${field('displayName', 'Display name', { required: true })}${field('category', 'Business category', { wide: true })}${field('logoAlt', 'Logo description', { wide: true })}${field('contactFilename', 'Contact download filename', { wide: true, help: 'For example TapX.vcf. Keep the .vcf extension.' })}</div></section>${nextButton()}`;
}
function featureToggle(path, title, description) { return `<div class="visibility-row"><div><strong>${e(title)}</strong><p>${e(description)}</p></div>${toggle(path, '', title)}</div>`; }
function contactsPanel() {
  return `<section class="form-card">${heading('02', 'Contact & links', 'Choose how your customers reach your business.')}
    ${featureToggle('whatsapp.enabled', 'WhatsApp', 'Show the main WhatsApp contact button.')}${draft.whatsapp.enabled ? `<div class="subsection form-grid">${field('whatsapp.number', 'WhatsApp number', { type: 'tel', required: true })}${field('whatsapp.display', 'Display number')}${field('whatsapp.message', 'Prefilled WhatsApp message', { type: 'textarea', wide: true })}</div>` : ''}
    <div class="subsection">${featureToggle('mobile.enabled', 'Save contact', 'Include this phone number in the downloadable business contact.')}${draft.mobile.enabled ? `<div class="form-grid">${field('mobile.number', 'Business phone', { type: 'tel', required: true })}${field('mobile.display', 'Display phone')}</div>` : ''}</div>
    <div class="subsection">${featureToggle('email.enabled', 'Email', 'Show the email feature tile.')}${draft.email.enabled ? `${featureToggle('email.demo', 'Email preview mode', 'Open a sample feature preview. Turn off to use the real email address.')}${field('email.address', 'Email address', { type: 'email', required: !draft.email.demo })}` : ''}</div>
    <div class="subsection">${featureToggle('fax.enabled', 'Fax', 'Show a fax tile and include the fax number in the saved contact.')}${draft.fax.enabled ? `<div class="form-grid">${field('fax.number', 'Fax number', { type: 'tel', required: true })}${field('fax.display', 'Display fax number')}</div>` : ''}</div></section>
    <section class="form-card">${heading('↳', 'Website, location & reviews', 'Use real business links or keep the original feature previews.')}${featureToggle('website.enabled', 'Website', 'Show the website in the Social Media & Website sheet.')}${draft.website.enabled ? field('website.url', 'Website URL', { type: 'url', required: true }) : ''}
    <div class="subsection">${featureToggle('location.enabled', 'Location', 'Help customers find the business.')}${draft.location.enabled ? `${featureToggle('location.demo', 'Location preview mode', 'Turn off to open your actual location link.')}${field('location.url', 'Google Maps / location URL', { type: 'url', required: !draft.location.demo })}` : ''}</div>
    <div class="subsection">${featureToggle('review.enabled', 'Google Review', 'Show the review feature card.')}${draft.review.enabled ? `${featureToggle('review.demo', 'Review preview mode', 'Turn off to open the actual business review page.')}${field('review.url', 'Review URL', { type: 'url', required: !draft.review.demo })}` : ''}</div></section>${nextButton()}`;
}
function bankPanel() {
  return `<section class="form-card">${heading('03', 'Bank accounts', 'The account details shown in the bank popup.')}${featureToggle('bank.enabled', 'Show bank details', 'Allow visitors to view and copy bank account details.')}${featureToggle('bank.demo', 'Sample bank notice', 'Keep the original DEMO ONLY notice when showing fictional accounts.')}${field('bank.buttonText', 'Bank tile label')}
    <div class="subsection">${draft.bank.accounts.map((account, i) => `<div class="entry-card"><div class="entry-header">${icon('bank')}<strong>${e(account.bankName || 'New bank account')}</strong>${controls('bank.accounts', i, draft.bank.accounts.length, 'bank account')}</div><div class="form-grid">${field(`bank.accounts.${i}.bankName`, 'Bank name', { required: draft.bank.enabled })}${field(`bank.accounts.${i}.accountName`, 'Account holder', { required: draft.bank.enabled })}${field(`bank.accounts.${i}.accountNumber`, 'Account number', { wide: true, required: draft.bank.enabled, help: 'Keep all digits, including leading zeroes.' })}${field(`bank.accounts.${i}.branch`, 'Branch', { required: draft.bank.enabled })}${field(`bank.accounts.${i}.branchCode`, 'Branch code (optional)')}</div></div>`).join('')}${addButton('bank.accounts', 'Add bank account')}</div></section>${nextButton()}`;
}
function socialPanel() {
  return `<section class="form-card">${heading('04', 'Social media', 'Your social profiles, in one familiar sheet.')}${featureToggle('social.enabled', 'Show social media', 'Choose which profiles visitors can explore.')}<div class="subsection">${draft.social.links.map((link, i) => `<div class="entry-card"><div class="entry-header">${icon(link.platform)}<strong>${e(link.label || 'Social link')}</strong>${toggle(`social.links.${i}.enabled`, 'Show', 'Show this social link')}${controls('social.links', i, draft.social.links.length, 'social link')}</div><div class="form-grid">${field(`social.links.${i}.platform`, 'Platform', { options: PLATFORMS })}${field(`social.links.${i}.label`, 'Display label')}${field(`social.links.${i}.url`, 'Profile URL', { type: 'url', wide: true, required: link.enabled && !link.demo })}</div>${featureToggle(`social.links.${i}.demo`, 'Preview mode', 'Turn off to open the real profile link.')}</div>`).join('')}${addButton('social.links', 'Add social link')}</div></section>${nextButton()}`;
}
function hoursPanel() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `<section class="form-card">${heading('05', 'Opening hours', 'Show whether the business is open, using the selected time zone.')}${featureToggle('hours.enabled', 'Show opening status', 'Opening status is hidden in the original demo.')}${field('hours.timeZone', 'Time zone', { help: 'Asia/Colombo uses Sri Lanka time.' })}<div class="subsection">${days.map((day, index) => `<div class="schedule-day"><div class="entry-header"><strong>${day}</strong><label class="toggle-wrap"><input type="checkbox" data-day="${index}" ${draft.hours.weekly[index].length ? 'checked' : ''} aria-label="Open on ${day}"><span>${draft.hours.weekly[index].length ? 'Open' : 'Closed'}</span></label></div>${draft.hours.weekly[index].map((interval, i) => `<div class="schedule-interval"><div class="form-grid">${field(`hours.weekly.${index}.${i}.0`, 'Opens', { type: 'time' })}${field(`hours.weekly.${index}.${i}.1`, 'Closes', { type: 'time' })}</div><button class="icon-button remove" type="button" data-command="remove-interval" data-day="${index}" data-index="${i}" aria-label="Remove ${day} interval">${icon('trash')}</button></div>`).join('')}${draft.hours.weekly[index].length && draft.hours.weekly[index].length < 4 ? `<button class="text-button" type="button" data-command="add-interval" data-day="${index}">${icon('plus')}Add interval</button>` : ''}</div>`).join('')}</div></section>${nextButton()}`;
}
const WORDING_GROUPS = [
  ['Your introduction', [['noticeTitle', 'Notice heading'], ['noticeDescription', 'Notice description']]],
  ['Contact actions', [['whatsappTitle', 'WhatsApp button'], ['whatsappHint', 'WhatsApp supporting text'], ['saveContact', 'Save contact button'], ['saveHint', 'Save contact supporting text']]],
  ['Feature sheets', [['bankTitle', 'Bank popup heading'], ['bankDescription', 'Bank popup description'], ['bankNotice', 'Sample bank notice'], ['socialTitle', 'Social popup heading'], ['socialDescription', 'Social popup description'], ['reviewTitle', 'Review card heading'], ['reviewDescription', 'Review card description']]]
];
function designPanel() {
  const labels = ['Text colour', 'TapX accent', 'Page background', 'Page surface', 'Soft background', 'Border colour'];
  return `<section class="form-card">${heading('06', 'Design & wording', 'Keep the original design or personalise the page colours.')}<div class="preset-grid">${PRESETS.map((preset, index) => `<button class="preset ${COLOURS.every((key, i) => draft.design[key] === preset.colors[i]) ? 'active' : ''}" type="button" data-preset="${index}"><span class="preset-colors">${preset.colors.slice(0, 3).map(color => `<i style="background:${color}"></i>`).join('')}</span>${e(preset.name)}</button>`).join('')}</div><div class="form-grid">${COLOURS.map((key, i) => `<div class="field"><label for="colour-${key}">${labels[i]}</label><div class="colour-field"><input type="color" data-path="design.${key}" id="colour-${key}" value="${draft.design[key]}"><span id="colour-value-${key}">${draft.design[key].toUpperCase()}</span></div></div>`).join('')}</div>${featureToggle('design.showLogo', 'Business logo', 'Show the logo and full-size logo preview.')}${featureToggle('design.showDemoNotice', 'Demo introduction', 'Show the introduction notice above the contact actions.')}</section><section class="form-card">${heading('↳', 'Headings & button labels', 'Use {name}, {phone} and {website} in contact supporting text.')} ${WORDING_GROUPS.map(([title, fields]) => `<div class="wording-group"><h3>${title}</h3><div class="form-grid">${fields.map(([key, label]) => field(`wording.${key}`, label, { wide: true })).join('')}</div></div>`).join('')}</section>`;
}

function renderNav() { $('#section-nav').innerHTML = SECTIONS.map(s => `<button class="nav-item ${s.id === section ? 'active' : ''}" type="button" data-section="${s.id}" ${s.id === section ? 'aria-current="page"' : ''}>${icon(s.icon)}${e(s.label)}</button>`).join(''); }
function renderPanel() {
  if (!draft) return;
  const renderer = { business: businessPanel, contacts: contactsPanel, bank: bankPanel, social: socialPanel, hours: hoursPanel, design: designPanel };
  $('#panel').innerHTML = renderer[section]();
  renderNav(); updateState();
}
function showSection(id, { scroll = true } = {}) {
  if (!SECTIONS.some(s => s.id === id)) return;
  section = id; renderPanel();
  if (scroll) $('#editor').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function updateState() {
  const isDirty = dirty();
  const status = $('#save-status');
  status.className = `save-status ${isDirty ? 'dirty' : ''}`;
  status.innerHTML = `<i></i>${saving ? 'Saving…' : uploading ? 'Preparing photo…' : isDirty ? 'Unsaved changes' : 'All changes saved'}`;
  $('#save-button').disabled = !isDirty || saving || uploading;
  const canViewSaved = Boolean(savedAt) && !isDirty && !saving && !uploading;
  $('#view-saved-card-button').hidden = !canViewSaved;
  $('#save-button').hidden = canViewSaved;
  $('#preview-save-button').disabled = !isDirty || saving || uploading;
  $('#discard-button').disabled = !isDirty || saving || uploading;
  $('#reset-button').disabled = saving || uploading || JSON.stringify(draft) === JSON.stringify(DEFAULT_CARD);
  $('#save-button').querySelector('span:last-child').textContent = saving ? 'Saving…' : 'Save changes';
  const name = draft.displayName || draft.name;
  $('#owner-avatar').textContent = name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'TX';
  $('#owner-avatar').title = name;
  $('#saved-at').textContent = savedAt ? `Last saved ${new Date(savedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · In this browser` : 'Your page is saved only in this browser.';
  $('.draft-label').classList.toggle('is-saved', !isDirty);
  $('.draft-label').innerHTML = `<i></i>${isDirty ? 'Unsaved draft preview' : 'Saved card preview'}`;
}
function sendPreview(frame) { if (frame?.contentWindow && draft) frame.contentWindow.postMessage({ type: 'tapx:render', card: clone(draft) }, location.origin); }
function refreshPreviews() { sendPreview($('#live-frame')); if ($('#preview-dialog').open) sendPreview($('#full-frame')); }
// Keep the same mobile layout as the full preview at every editor width.
function fitLivePreview() {
  const frame = $('#live-frame');
  const phone = frame.parentElement;
  if (!phone.clientWidth || !phone.clientHeight) return;
  const viewportWidth = 390;
  const scale = phone.clientWidth / viewportWidth;
  frame.style.width = viewportWidth + 'px';
  frame.style.height = phone.clientHeight / scale + 'px';
  frame.style.transform = 'scale(' + scale + ')';
}

function stashDraft() {
  try {
    if (dirty()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ card: draft, revision, updatedAt: new Date().toISOString() }));
    else localStorage.removeItem(DRAFT_KEY);
  } catch { /* The last saved record stays intact if browser draft storage is full. */ }
}
function changed({ render = false } = {}) {
  updateState();
  if (render) renderPanel();
  clearTimeout(previewTimer); previewTimer = setTimeout(refreshPreviews, 80);
  clearTimeout(draftTimer); draftTimer = setTimeout(stashDraft, 350);
}
function showError(message) { $('#error-banner').textContent = message; $('#error-banner').hidden = false; }
function clearErrors() { errors = []; $('#error-banner').hidden = true; }
function goToErrors() {
  const first = errors[0], group = first.path.split('.')[0];
  section = ['design', 'wording'].includes(group) ? 'design' : ['mobile', 'whatsapp', 'email', 'fax', 'website', 'location', 'review'].includes(group) ? 'contacts' : ['bank', 'social', 'hours'].includes(group) ? group : 'business';
  renderPanel();
  const input = document.querySelector('[data-path="' + first.path + '"]');
  input?.focus(); input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  showError(first.message);
}
async function saveCard() {
  if (!draft || saving || uploading || !dirty()) return;
  clearErrors(); errors = validateCard(draft);
  if (errors.length) { $('#preview-dialog').close(); goToErrors(); return; }
  saving = true; updateState();
  // Keep a snapshot: edits made while this request is in flight stay unsaved.
  const submitted = clone(draft);
  try {
    const record = await cardStore.save(submitted, revision);
    saved = clone(record.card); revision = record.revision; savedAt = record.savedAt;
    stashDraft();
    toast(dirty() ? 'Saved. Your newest edits are still in the draft.' : 'Your page is saved. Looking good.');
    if (!dirty()) $('#preview-dialog').close();
  } catch (error) {
    if (error.errors) { errors = error.errors; $('#preview-dialog').close(); goToErrors(); }
    else showError(error.message || 'Could not save in this browser. Allow site storage and try again.');
    toast('Could not save. Your edits are still here.', 'info');
  } finally { saving = false; updateState(); }
}
function openPreview() { if (!draft) return; refreshPreviews(); $('#preview-dialog').showModal(); sendPreview($('#full-frame')); }
function focusAdded(path, index) {
  requestAnimationFrame(() => {
    const target = document.querySelector(`[data-path="${path}.${index}"]`) || document.querySelector(`[data-path^="${path}.${index}."]:not([type="checkbox"])`);
    target?.focus(); target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
function addEntry(path) {
  const templates = { 'bank.accounts': { bankName: '', accountName: '', accountNumber: '', branch: '', branchCode: '' }, 'social.links': { id: uid(), platform: 'facebook', label: 'Facebook', url: '', enabled: true, demo: true } };
  if (!Object.hasOwn(templates, path)) return;
  const array = get(path), max = path === 'bank.accounts' ? 8 : 20;
  if (array.length >= max) return toast('You can add up to ' + max + ' entries.', 'info');
  array.push(templates[path]); changed({ render: true }); focusAdded(path, array.length - 1);
}
async function uploadPhoto(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return toast('Choose a JPG, PNG or WebP logo smaller than 10 MB.', 'info');
  uploading = true; updateState();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    draft.logo = canvas.toDataURL('image/webp', .9); draft.design.showLogo = true;
    changed({ render: true }); toast('Logo added to your draft.');
  } catch { toast('That image could not be opened. Try another logo.', 'info'); }
  finally { URL.revokeObjectURL(url); uploading = false; updateState(); }
}

document.addEventListener('input', event => {
  const input = event.target.closest('[data-path]');
  if (!input || !draft || input.tagName === 'SELECT' || input.type === 'checkbox') return;
  set(input.dataset.path, input.type === 'range' ? Number(input.value) : input.value);
  if (input.type === 'color') { $(`#colour-value-${input.dataset.path.split('.')[1]}`).textContent = input.value.toUpperCase(); document.querySelectorAll('.preset.active').forEach(el => el.classList.remove('active')); }
  if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); const errorEl = document.getElementById(`${input.id}-error`); if (errorEl) errorEl.hidden = true; errors = errors.filter(error => error.path !== input.dataset.path); }
  changed();
});
document.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'photo-file') return uploadPhoto(input.files[0]);
  if (input.dataset.day !== undefined) { draft.hours.weekly[Number(input.dataset.day)] = input.checked ? [['08:00', '22:00']] : []; changed({ render: true }); return; }
  if (!input.dataset.path || !draft) return;
  const path = input.dataset.path;
  if (input.type === 'checkbox') { set(path, input.checked); changed({ render: true }); }
  if (input.tagName === 'SELECT') {
    const old = get(path); set(path, input.value);
    if (path.endsWith('.platform')) {
      const base = path.slice(0, -9);
      if (get(`${base}.label`) === PLATFORMS[old]) set(`${base}.label`, PLATFORMS[input.value]);
    }
    changed({ render: true });
  }
});
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.section) { if (draft) showSection(button.dataset.section); return; }
  if (!draft) return;
  if (button.dataset.add) return addEntry(button.dataset.add);
  if (button.dataset.remove) { get(button.dataset.remove).splice(Number(button.dataset.index), 1); clearErrors(); changed({ render: true }); return; }
  if (button.dataset.move) {
    const array = get(button.dataset.move); const from = Number(button.dataset.index); const to = from + Number(button.dataset.direction);
    if (to >= 0 && to < array.length) { [array[from], array[to]] = [array[to], array[from]]; clearErrors(); changed({ render: true }); }
    return;
  }
  if (button.dataset.preset) { COLOURS.forEach((key, i) => { draft.design[key] = PRESETS[Number(button.dataset.preset)].colors[i]; }); changed({ render: true }); return; }
  if (button.dataset.device) {
    $('.large-preview-canvas').classList.toggle('desktop', button.dataset.device === 'desktop');
    document.querySelectorAll('[data-device]').forEach(el => { const active = el === button; el.classList.toggle('active', active); el.setAttribute('aria-pressed', String(active)); }); return;
  }
  const command = button.dataset.command;
  if (command === 'reset-logo') { draft.logo = DEFAULT_CARD.logo; changed({ render: true }); }
  if (command === 'add-interval') { const list = draft.hours.weekly[Number(button.dataset.day)]; if (list.length < 4) { list.push(['08:00', '22:00']); changed({ render: true }); } }
  if (command === 'remove-interval') { draft.hours.weekly[Number(button.dataset.day)].splice(Number(button.dataset.index), 1); changed({ render: true }); }
  if (command === 'upload-photo') $('#photo-file').click();
  if (command === 'close-preview') $('#preview-dialog').close();
  if (command === 'cancel-discard') $('#discard-dialog').close();
  if (command === 'cancel-reset') $('#reset-dialog').close();
  if (command === 'confirm-reset') { draft = clone(DEFAULT_CARD); clearErrors(); $('#reset-dialog').close(); renderPanel(); refreshPreviews(); stashDraft(); toast('Original page restored to your draft. Preview and save when ready.'); }
  if (command === 'confirm-discard') { draft = clone(saved); clearErrors(); $('#discard-dialog').close(); renderPanel(); refreshPreviews(); stashDraft(); toast('Restored your saved page.'); }
  if (command === 'restore-draft' && recoveredDraft) { draft = clone(recoveredDraft.card); clearErrors(); $('#recovery-banner').hidden = true; recoveredDraft = null; renderPanel(); changed(); toast('Your unfinished edit is back.'); }
  if (command === 'dismiss-draft') { $('#recovery-banner').hidden = true; recoveredDraft = null; try { localStorage.removeItem(DRAFT_KEY); } catch {} }
});
$('#save-button').addEventListener('click', saveCard);
$('#preview-save-button').addEventListener('click', saveCard);
$('#preview-button').addEventListener('click', openPreview);
$('#expand-preview').addEventListener('click', openPreview);
$('#discard-button').addEventListener('click', () => $('#discard-dialog').showModal());
$('#reset-button').addEventListener('click', () => $('#reset-dialog').showModal());
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveCard(); } });
window.addEventListener('beforeunload', event => { if (dirty()) { stashDraft(); event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.data?.type !== 'tapx:ready') return;
  const frame = [$('#live-frame'), $('#full-frame')].find(frame => frame.contentWindow === event.source);
  sendPreview(frame);
});
for (const frame of [$('#live-frame'), $('#full-frame')]) frame.addEventListener('load', () => sendPreview(frame));

const livePreviewObserver = new ResizeObserver(fitLivePreview);
livePreviewObserver.observe($('#live-frame').parentElement);
fitLivePreview();

hydrateIcons(); renderNav();
function initialise() {
  try {
    const record = cardStore.read();
    draft = clone(record.card); saved = clone(draft); revision = record.revision; savedAt = record.savedAt;
    renderPanel(); refreshPreviews();
    try { const recovered = JSON.parse(localStorage.getItem(DRAFT_KEY)); if (recovered?.card) recovered.card = applyEditingPolicy(recovered.card); if (recovered?.card && !validateCard(recovered.card, { allowIncomplete: true }).length && JSON.stringify(recovered.card) !== JSON.stringify(saved)) { recoveredDraft = recovered; $('#recovery-banner').hidden = false; } } catch {}
  } catch (error) {
    const help = 'Allow site storage, then reload the page or try again.';
    $('#panel').innerHTML = `<div class="form-card"><h2>Your page is taking a little longer.</h2><p class="field-help">${e(error.message)} ${help}</p><button class="button secondary" type="button" id="retry-load">Try again</button></div>`;
    $('#retry-load').addEventListener('click', initialise);
    $('#save-status').className = 'save-status error'; $('#save-status').innerHTML = '<i></i>Storage unavailable';
  }
}
initialise();
