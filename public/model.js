import business from './business-config.js';

export const clone = value => structuredClone(value);
export const PLATFORMS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', x: 'X / Twitter', other: 'Other link' };
export const DEFAULT_CARD = {
  ...clone(business),
  logo: './assets/tapx-demo.webp',
  review: { ...business.review, demo: true },
  bank: { ...clone(business.bank), demo: true },
  hours: { enabled: false, timeZone: 'Asia/Colombo', weekly: Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, []])) },
  design: { canvas: '#f3f3f1', surface: '#ffffff', ink: '#202225', accent: '#dc263d', soft: '#f7f7f5', line: '#e5e6e3', showLogo: true, showDemoNotice: true },
  wording: {
    noticeTitle: 'Interactive Demo', noticeDescription: 'Explore what your business could look like with TapX.',
    whatsappTitle: 'Send on WhatsApp', whatsappHint: 'Chat with {name} · {phone}', saveContact: 'Save contact', saveHint: '{name} · {website}',
    reviewTitle: 'Google Review', reviewDescription: 'Preview the review experience',
    bankTitle: 'Bank details', bankDescription: 'Sample details only. Try the copy buttons.', bankNotice: 'DEMO ONLY — These are fictional details. Do not make any payment.',
    socialTitle: 'Social Media & Website', socialDescription: 'Explore our social profiles and website.'
  }
};
// Hosting redirects and SEO stay with the original public website.
delete DEFAULT_CARD.redirect;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function safeURL(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}
export function photoURL(value) {
  return value === './assets/tapx-demo.webp' || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value ?? '') ? value : '';
}
export function applyEditingPolicy(value) {
  const card = clone(value);
  if (!card || typeof card !== 'object' || Array.isArray(card)) return card;
  card.tapx = clone(DEFAULT_CARD.tapx);
  card.seo = clone(DEFAULT_CARD.seo);
  return card;
}
export function makeVCard(c) {
  const esc = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/\r/g, '').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const phone = value => '+' + String(value).replace(/\D/g, '');
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + esc(c.name), 'N:' + esc(c.name) + ';;;;', 'ORG:' + esc(c.name)];
  if (c.mobile.enabled) lines.push('TEL;TYPE=CELL,VOICE:' + phone(c.mobile.number));
  if (c.fax.enabled) lines.push('TEL;TYPE=FAX:' + phone(c.fax.number));
  if (c.email.enabled && !c.email.demo) lines.push('EMAIL:' + esc(c.email.address));
  lines.push('URL:' + esc(c.website.enabled ? safeURL(c.website.url) : c.seo.siteUrl), 'END:VCARD');
  const encoder = new TextEncoder();
  return lines.map(line => {
    let folded = '', bytes = 0;
    for (const char of line) { const length = encoder.encode(char).length; if (bytes + length > 75) { folded += '\r\n '; bytes = 1; } folded += char; bytes += length; }
    return folded;
  }).join('\r\n') + '\r\n';
}

export function validateCard(c, { allowIncomplete = false } = {}) {
  const errors = [], error = (path, message) => errors.push({ path, message });
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(c)) return [{ path: '', message: 'Choose valid business details.' }];
  for (const key of ['mobile', 'whatsapp', 'email', 'fax', 'bank', 'location', 'review', 'social', 'website', 'hours', 'seo', 'tapx', 'design', 'wording']) if (!object(c[key])) error(key, 'The ' + key + ' section is missing.');
  if (errors.length) return errors;
  const text = (value, path, max = 2000) => { if (typeof value !== 'string' || value.length > max) error(path, 'Use text with no more than ' + max + ' characters.'); };
  const required = (value, path, label) => { if (!allowIncomplete && (typeof value !== 'string' || !value.trim())) error(path, 'Enter ' + label + '.'); };
  const bool = (value, path) => { if (typeof value !== 'boolean') error(path, 'Choose a visibility setting.'); };
  const phone = (value, path) => { if (!allowIncomplete && !/^\+?[\d ()-]{7,30}$/.test(value ?? '')) error(path, 'Enter an international phone number, for example +94707703333.'); };
  const url = (value, path) => { if (!allowIncomplete && !safeURL(value)) error(path, 'Enter a complete https:// link without login details.'); };
  const list = (value, path, max) => { if (!Array.isArray(value) || value.length > max) { error(path, 'Use no more than ' + max + ' entries.'); return []; } return value; };
  for (const key of ['name', 'displayName', 'category', 'language', 'logoAlt', 'contactFilename']) text(c[key], key, 1000);
  required(c.name, 'name', 'a business name'); required(c.displayName, 'displayName', 'a display name');
  text(c.logo, 'logo', 5_000_000); if (!photoURL(c.logo)) error('logo', 'Upload a JPG, PNG or WebP logo.');
  if (!/^[\w.-]+\.vcf$/.test(c.contactFilename ?? '')) error('contactFilename', 'Use a simple filename ending in .vcf.');
  for (const key of ['mobile', 'whatsapp', 'fax']) {
    bool(c[key].enabled, key + '.enabled'); text(c[key].number, key + '.number'); text(c[key].display, key + '.display');
    if (c[key].enabled) phone(c[key].number, key + '.number');
  }
  text(c.mobile.label, 'mobile.label'); text(c.whatsapp.message, 'whatsapp.message', 4000);
  for (const key of ['email', 'location', 'review']) { bool(c[key].enabled, key + '.enabled'); bool(c[key].demo, key + '.demo'); }
  text(c.email.address, 'email.address');
  if (!allowIncomplete && c.email.enabled && !c.email.demo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.address ?? '')) error('email.address', 'Enter a valid email address.');
  for (const key of ['location', 'review']) { text(c[key].url, key + '.url'); text(c[key].text, key + '.text'); if (c[key].enabled && !c[key].demo) url(c[key].url, key + '.url'); }
  bool(c.website.enabled, 'website.enabled'); text(c.website.url, 'website.url'); if (c.website.enabled) url(c.website.url, 'website.url');
  bool(c.bank.enabled, 'bank.enabled'); bool(c.bank.demo, 'bank.demo'); text(c.bank.buttonText, 'bank.buttonText');
  if (c.bank.enabled) { required(c.bank.buttonText, 'bank.buttonText', 'a bank button label'); if (!allowIncomplete && !c.bank.accounts?.length) error('bank.accounts', 'Add at least one account, or hide bank details.'); }
  for (const [i, account] of list(c.bank.accounts, 'bank.accounts', 8).entries()) {
    if (!object(account)) { error('bank.accounts.' + i, 'Invalid bank account.'); continue; }
    for (const key of ['bankName', 'accountName', 'accountNumber', 'branch', 'branchCode']) text(account[key], 'bank.accounts.' + i + '.' + key);
    if (c.bank.enabled) {
      for (const key of ['bankName', 'accountName', 'branch']) required(account[key], 'bank.accounts.' + i + '.' + key, key === 'bankName' ? 'a bank name' : key === 'accountName' ? 'an account name' : 'a branch');
      if (!allowIncomplete && !/^\d{6,34}$/.test(account.accountNumber ?? '')) error('bank.accounts.' + i + '.accountNumber', 'Use 6–34 digits, preserving leading zeroes.');
      if (!allowIncomplete && account.branchCode && !/^\d{2,10}$/.test(account.branchCode)) error('bank.accounts.' + i + '.branchCode', 'Use 2–10 digits for the branch code.');
    }
  }
  bool(c.social.enabled, 'social.enabled');
  for (const [i, link] of list(c.social.links, 'social.links', 20).entries()) {
    if (!object(link)) { error('social.links.' + i, 'Invalid social link.'); continue; }
    for (const key of ['platform', 'label', 'url']) text(link[key], 'social.links.' + i + '.' + key);
    if (!Object.hasOwn(PLATFORMS, link.platform)) error('social.links.' + i + '.platform', 'Choose a platform.');
    bool(link.enabled, 'social.links.' + i + '.enabled'); bool(link.demo, 'social.links.' + i + '.demo');
    if (c.social.enabled && link.enabled) { required(link.label, 'social.links.' + i + '.label', 'a link label'); if (!link.demo) url(link.url, 'social.links.' + i + '.url'); }
  }
  bool(c.hours.enabled, 'hours.enabled'); text(c.hours.timeZone, 'hours.timeZone');
  try { new Intl.DateTimeFormat('en', { timeZone: c.hours.timeZone }); } catch { error('hours.timeZone', 'Enter a valid time zone, for example Asia/Colombo.'); }
  if (!object(c.hours.weekly)) error('hours.weekly', 'Choose the weekly opening hours.');
  else for (let day = 0; day < 7; day++) for (const [i, interval] of list(c.hours.weekly[day], 'hours.weekly.' + day, 4).entries()) {
    if (!Array.isArray(interval) || interval.length !== 2 || interval.some(value => typeof value !== 'string' || (!allowIncomplete && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) || (!allowIncomplete && interval[0] === interval[1])) error('hours.weekly.' + day + '.' + i + '.0', 'Choose different opening and closing times. Overnight hours are supported.');
  }
  for (const [key, value] of Object.entries(DEFAULT_CARD.design)) if (typeof value === 'boolean') bool(c.design[key], 'design.' + key); else if (!/^#[a-f\d]{6}$/i.test(c.design[key] ?? '')) error('design.' + key, 'Choose a valid colour.');
  for (const key of Object.keys(DEFAULT_CARD.wording)) text(c.wording[key], 'wording.' + key);
  if (JSON.stringify(c.tapx) !== JSON.stringify(DEFAULT_CARD.tapx)) error('tapx', 'TapX branding is managed by TapX.');
  if (JSON.stringify(c.seo) !== JSON.stringify(DEFAULT_CARD.seo)) error('seo', 'The public page link and search settings are managed by TapX.');
  return errors;
}
